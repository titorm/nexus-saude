"""
Monitoring Dashboard API
Provides endpoints for monitoring the ML service performance,
metrics visualization, and alert management.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json

from ..core.monitoring import monitoring, get_service_health, check_alerts, ALERT_THRESHOLDS
from ..core.database import DatabaseOperations

router = APIRouter(tags=["monitoring"])

# ============================================================================
# HEALTH AND STATUS ENDPOINTS
# ============================================================================

@router.get("/health")
async def get_health():
    """Get comprehensive service health status"""
    try:
        health_status = get_service_health()
        alerts = check_alerts()
        
        return {
            **health_status,
            "alerts": alerts,
            "alerts_count": len(alerts),
            "service_version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/alerts")
async def get_alerts():
    """Get current active alerts"""
    try:
        alerts = check_alerts()
        return {
            "alerts": alerts,
            "count": len(alerts),
            "timestamp": datetime.utcnow().isoformat(),
            "thresholds": ALERT_THRESHOLDS
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@router.get("/status")
async def get_service_status():
    """Get detailed service status"""
    try:
        health = get_service_health()
        db_ops = DatabaseOperations()
        
        # Get recent activity
        training_jobs = await db_ops.get_training_jobs(limit=5)
        predictions = await db_ops.get_predictions(limit=10)
        
        return {
            "status": health["status"],
            "uptime": health["uptime_seconds"],
            "system": health["system"],
            "models": health["models"],
            "recent_activity": {
                "training_jobs": len(training_jobs),
                "predictions": len(predictions),
                "last_training": training_jobs[0]["created_at"] if training_jobs else None,
                "last_prediction": predictions[0]["created_at"] if predictions else None
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

# ============================================================================
# METRICS ENDPOINTS
# ============================================================================

@router.get("/metrics/summary")
async def get_metrics_summary():
    """Get summary of key metrics"""
    try:
        db_ops = DatabaseOperations()
        
        # Get recent metrics
        training_jobs = await db_ops.get_training_jobs(limit=10)
        predictions = await db_ops.get_predictions(limit=100)
        
        # Calculate summary stats
        total_predictions = len(predictions)
        diagnostic_predictions = len([p for p in predictions if p.get("model_type") == "diagnostic"])
        risk_predictions = len([p for p in predictions if p.get("model_type") == "risk"])
        
        # Get average model performance
        diagnostic_accuracy = 0.0
        risk_accuracy = 0.0
        
        for job in training_jobs:
            if job.get("model_type") == "diagnostic":
                diagnostic_accuracy = max(diagnostic_accuracy, job.get("accuracy", 0.0))
            elif job.get("model_type") == "risk":
                risk_accuracy = max(risk_accuracy, job.get("accuracy", 0.0))
        
        return {
            "summary": {
                "total_predictions": total_predictions,
                "diagnostic_predictions": diagnostic_predictions,
                "risk_predictions": risk_predictions,
                "total_training_jobs": len(training_jobs)
            },
            "model_performance": {
                "diagnostic_accuracy": diagnostic_accuracy,
                "risk_accuracy": risk_accuracy
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics summary: {str(e)}")

@router.get("/metrics/predictions")
async def get_prediction_metrics(
    model_type: Optional[str] = Query(None, description="Filter by model type"),
    hours: int = Query(24, description="Hours to look back")
):
    """Get prediction metrics for specified time period"""
    try:
        db_ops = DatabaseOperations()
        
        # Calculate time range
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get predictions
        predictions = await db_ops.get_predictions(limit=1000)
        
        # Filter by time and model type
        filtered_predictions = []
        for pred in predictions:
            pred_time = datetime.fromisoformat(pred["created_at"].replace("Z", "+00:00"))
            if pred_time >= cutoff_time:
                if not model_type or pred.get("model_type") == model_type:
                    filtered_predictions.append(pred)
        
        # Calculate metrics
        total_predictions = len(filtered_predictions)
        
        # Group by hour
        hourly_counts = {}
        confidence_scores = []
        
        for pred in filtered_predictions:
            pred_time = datetime.fromisoformat(pred["created_at"].replace("Z", "+00:00"))
            hour_key = pred_time.strftime("%Y-%m-%d %H:00")
            hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1
            
            # Extract confidence if available
            if isinstance(pred.get("prediction"), dict):
                confidence = pred["prediction"].get("confidence", 0.0)
                if confidence > 0:
                    confidence_scores.append(confidence)
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        return {
            "period": f"Last {hours} hours",
            "model_type": model_type or "all",
            "total_predictions": total_predictions,
            "average_confidence": avg_confidence,
            "hourly_distribution": hourly_counts,
            "confidence_distribution": {
                "min": min(confidence_scores) if confidence_scores else 0.0,
                "max": max(confidence_scores) if confidence_scores else 0.0,
                "avg": avg_confidence
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prediction metrics: {str(e)}")

@router.get("/metrics/training")
async def get_training_metrics():
    """Get training job metrics"""
    try:
        db_ops = DatabaseOperations()
        training_jobs = await db_ops.get_training_jobs(limit=50)
        
        # Group by model type
        diagnostic_jobs = [job for job in training_jobs if job.get("model_type") == "diagnostic"]
        risk_jobs = [job for job in training_jobs if job.get("model_type") == "risk"]
        
        # Calculate metrics
        def calc_model_metrics(jobs):
            if not jobs:
                return {"count": 0, "avg_accuracy": 0.0, "avg_training_time": 0.0}
            
            return {
                "count": len(jobs),
                "avg_accuracy": sum(job.get("accuracy", 0.0) for job in jobs) / len(jobs),
                "avg_training_time": sum(job.get("training_time", 0.0) for job in jobs) / len(jobs),
                "best_accuracy": max(job.get("accuracy", 0.0) for job in jobs),
                "latest_training": jobs[0]["created_at"] if jobs else None
            }
        
        return {
            "total_jobs": len(training_jobs),
            "diagnostic_model": calc_model_metrics(diagnostic_jobs),
            "risk_model": calc_model_metrics(risk_jobs),
            "recent_jobs": training_jobs[:5],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get training metrics: {str(e)}")

# ============================================================================
# PERFORMANCE MONITORING ENDPOINTS
# ============================================================================

@router.get("/performance/system")
async def get_system_performance():
    """Get current system performance metrics"""
    try:
        import psutil
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get process info
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "disk_percent": disk.percent,
                "disk_used_gb": disk.used / (1024**3),
                "disk_total_gb": disk.total / (1024**3)
            },
            "process": {
                "memory_rss_mb": process_memory.rss / (1024**2),
                "memory_vms_mb": process_memory.vms / (1024**2),
                "cpu_percent": process.cpu_percent()
            },
            "alerts": check_alerts(),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system performance: {str(e)}")

@router.get("/performance/models")
async def get_model_performance():
    """Get model performance metrics"""
    try:
        db_ops = DatabaseOperations()
        
        # Get recent predictions for performance analysis
        predictions = await db_ops.get_predictions(limit=100)
        
        # Analyze prediction patterns
        model_stats = {}
        
        for pred in predictions:
            model_type = pred.get("model_type", "unknown")
            if model_type not in model_stats:
                model_stats[model_type] = {
                    "count": 0,
                    "confidence_scores": [],
                    "avg_confidence": 0.0
                }
            
            model_stats[model_type]["count"] += 1
            
            # Extract confidence
            if isinstance(pred.get("prediction"), dict):
                confidence = pred["prediction"].get("confidence", 0.0)
                if confidence > 0:
                    model_stats[model_type]["confidence_scores"].append(confidence)
        
        # Calculate averages
        for model_type, stats in model_stats.items():
            if stats["confidence_scores"]:
                stats["avg_confidence"] = sum(stats["confidence_scores"]) / len(stats["confidence_scores"])
                stats["min_confidence"] = min(stats["confidence_scores"])
                stats["max_confidence"] = max(stats["confidence_scores"])
            else:
                stats["avg_confidence"] = 0.0
                stats["min_confidence"] = 0.0
                stats["max_confidence"] = 0.0
            
            # Remove raw scores for cleaner output
            del stats["confidence_scores"]
        
        return {
            "model_statistics": model_stats,
            "total_predictions_analyzed": len(predictions),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model performance: {str(e)}")

# ============================================================================
# DATA QUALITY MONITORING
# ============================================================================

@router.get("/data-quality/overview")
async def get_data_quality_overview():
    """Get data quality overview"""
    try:
        db_ops = DatabaseOperations()
        
        # Get data quality metrics
        metrics = await db_ops.get_data_quality_metrics()
        
        # Get recent predictions for quality analysis
        predictions = await db_ops.get_predictions(limit=100)
        
        # Analyze prediction data quality
        quality_issues = []
        
        for pred in predictions:
            input_data = pred.get("input_data", {})
            
            # Check for missing required fields
            required_fields = ["age", "sex"]
            for field in required_fields:
                if field not in input_data or input_data[field] is None:
                    quality_issues.append(f"Missing {field} in prediction {pred.get('id')}")
        
        return {
            "metrics": metrics,
            "quality_issues": quality_issues,
            "issues_count": len(quality_issues),
            "predictions_analyzed": len(predictions),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data quality overview: {str(e)}")

# ============================================================================
# CONFIGURATION AND THRESHOLDS
# ============================================================================

@router.get("/config/thresholds")
async def get_alert_thresholds():
    """Get current alert thresholds"""
    return {
        "thresholds": ALERT_THRESHOLDS,
        "description": {
            "cpu_usage_high": "CPU usage percentage threshold",
            "memory_usage_high": "Memory usage percentage threshold", 
            "disk_usage_high": "Disk usage percentage threshold",
            "model_confidence_low": "Minimum acceptable model confidence",
            "prediction_latency_high": "Maximum acceptable prediction latency (seconds)",
            "training_accuracy_low": "Minimum acceptable training accuracy",
            "data_drift_high": "Maximum acceptable data drift score",
            "error_rate_high": "Maximum acceptable error rate"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/config/models")
async def get_model_configuration():
    """Get current model configuration"""
    try:
        # This would typically come from a config file or database
        return {
            "models": {
                "diagnostic": {
                    "algorithm": "RandomForestClassifier",
                    "parameters": {
                        "n_estimators": 100,
                        "max_depth": 10,
                        "min_samples_split": 2,
                        "random_state": 42
                    },
                    "features_count": 40,
                    "status": "active"
                },
                "risk": {
                    "algorithm": "GradientBoostingClassifier",
                    "parameters": {
                        "n_estimators": 100,
                        "learning_rate": 0.1,
                        "max_depth": 6,
                        "random_state": 42
                    },
                    "features_count": 42,
                    "status": "active"
                }
            },
            "feature_engineering": {
                "categorical_encoding": "one_hot",
                "numerical_scaling": "standard",
                "derived_features": ["bmi", "age_normalized"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model configuration: {str(e)}")

# ============================================================================
# EXPORT AND REPORTING
# ============================================================================

@router.get("/reports/summary")
async def get_monitoring_report():
    """Get comprehensive monitoring report"""
    try:
        # Collect all monitoring data
        health = get_service_health()
        alerts = check_alerts()
        
        db_ops = DatabaseOperations()
        training_jobs = await db_ops.get_training_jobs(limit=10)
        predictions = await db_ops.get_predictions(limit=50)
        
        # Generate report
        report = {
            "report_timestamp": datetime.utcnow().isoformat(),
            "service_health": health,
            "alerts": {
                "active_alerts": alerts,
                "alert_count": len(alerts),
                "severity_breakdown": {
                    "critical": len([a for a in alerts if a.get("severity") == "critical"]),
                    "warning": len([a for a in alerts if a.get("severity") == "warning"]),
                    "error": len([a for a in alerts if a.get("severity") == "error"])
                }
            },
            "model_performance": {
                "training_jobs_count": len(training_jobs),
                "predictions_count": len(predictions),
                "latest_training": training_jobs[0] if training_jobs else None,
                "model_accuracies": {
                    job["model_type"]: job["accuracy"] 
                    for job in training_jobs[:2]
                }
            },
            "system_status": health.get("system", {}),
            "recommendations": []
        }
        
        # Add recommendations based on alerts
        if len(alerts) > 0:
            report["recommendations"].append("Review and address active alerts")
        
        if health.get("status") != "healthy":
            report["recommendations"].append("Investigate service health issues")
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate monitoring report: {str(e)}")