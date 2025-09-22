"""
Business Intelligence
Sistema de inteligência de negócios para o data warehouse
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging
import pandas as pd
import numpy as np
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class KPI:
    """Key Performance Indicator"""
    name: str
    category: str
    description: str
    calculation: str
    target_value: Optional[float] = None
    unit: str = ""
    format_type: str = "number"

@dataclass
class Metric:
    """Métrica de negócio"""
    name: str
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    trend: str = "stable"  # up, down, stable
    unit: str = ""
    category: str = ""

class BusinessIntelligence:
    """Sistema de Business Intelligence para análises de saúde"""
    
    def __init__(self, dimensional_model, etl_pipeline):
        self.dimensional_model = dimensional_model
        self.etl_pipeline = etl_pipeline
        self.is_active = False
        self.kpis = {}
        self.cached_metrics = {}
        self.cache_ttl = 3600  # 1 hour
        
    async def initialize(self):
        """Inicializa o sistema de BI"""
        try:
            logger.info("Initializing Business Intelligence...")
            
            # Define KPIs
            await self._define_kpis()
            
            # Setup metric calculations
            await self._setup_metric_calculations()
            
            self.is_active = True
            logger.info("Business Intelligence initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Business Intelligence: {e}")
            raise
    
    async def calculate_kpis(
        self, 
        date_range: Tuple[datetime, datetime],
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Metric]:
        """Calcula KPIs para um período específico"""
        try:
            logger.info(f"Calculating KPIs for period: {date_range[0]} to {date_range[1]}")
            
            kpi_results = {}
            
            for kpi_name, kpi in self.kpis.items():
                try:
                    metric = await self._calculate_kpi(kpi, date_range, filters)
                    kpi_results[kpi_name] = metric
                    
                except Exception as e:
                    logger.error(f"Error calculating KPI {kpi_name}: {e}")
                    # Continue with other KPIs
                    continue
            
            # Cache results
            cache_key = f"{date_range[0]}_{date_range[1]}_{hash(str(filters))}"
            self.cached_metrics[cache_key] = {
                "data": kpi_results,
                "timestamp": datetime.now(timezone.utc),
                "ttl": self.cache_ttl
            }
            
            logger.info(f"KPI calculation completed: {len(kpi_results)} KPIs calculated")
            return kpi_results
            
        except Exception as e:
            logger.error(f"Error calculating KPIs: {e}")
            raise
    
    async def generate_scorecard(
        self, 
        date_range: Tuple[datetime, datetime],
        categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Gera scorecard executivo"""
        try:
            logger.info("Generating executive scorecard")
            
            # Calculate all KPIs
            kpis = await self.calculate_kpis(date_range)
            
            # Filter by categories if specified
            if categories:
                kpis = {k: v for k, v in kpis.items() if self.kpis[k].category in categories}
            
            # Group by category
            scorecard = {}
            for kpi_name, metric in kpis.items():
                category = self.kpis[kpi_name].category
                if category not in scorecard:
                    scorecard[category] = {
                        "category": category,
                        "metrics": [],
                        "summary": {
                            "total_metrics": 0,
                            "improving": 0,
                            "declining": 0,
                            "stable": 0
                        }
                    }
                
                scorecard[category]["metrics"].append({
                    "name": kpi_name,
                    "description": self.kpis[kpi_name].description,
                    "value": metric.value,
                    "unit": metric.unit,
                    "trend": metric.trend,
                    "change_percent": metric.change_percent,
                    "target": self.kpis[kpi_name].target_value
                })
                
                scorecard[category]["summary"]["total_metrics"] += 1
                if metric.trend == "up":
                    scorecard[category]["summary"]["improving"] += 1
                elif metric.trend == "down":
                    scorecard[category]["summary"]["declining"] += 1
                else:
                    scorecard[category]["summary"]["stable"] += 1
            
            # Overall summary
            overall_summary = {
                "total_categories": len(scorecard),
                "total_metrics": sum(cat["summary"]["total_metrics"] for cat in scorecard.values()),
                "overall_trend": await self._calculate_overall_trend(kpis),
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return {
                "scorecard": scorecard,
                "overall_summary": overall_summary,
                "date_range": {
                    "start": date_range[0].isoformat(),
                    "end": date_range[1].isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating scorecard: {e}")
            raise
    
    async def analyze_trends(
        self, 
        metric_name: str, 
        periods: int = 12,
        period_type: str = "month"
    ) -> Dict[str, Any]:
        """Analisa tendências de uma métrica ao longo do tempo"""
        try:
            logger.info(f"Analyzing trends for metric: {metric_name}")
            
            # Calculate date ranges for each period
            end_date = datetime.now(timezone.utc)
            period_delta = timedelta(days=30) if period_type == "month" else timedelta(days=7)
            
            trend_data = []
            for i in range(periods):
                period_end = end_date - (period_delta * i)
                period_start = period_end - period_delta
                
                # Calculate metric for this period
                kpis = await self.calculate_kpis((period_start, period_end))
                if metric_name in kpis:
                    trend_data.append({
                        "period": period_start.strftime("%Y-%m-%d"),
                        "value": kpis[metric_name].value
                    })
            
            # Reverse to get chronological order
            trend_data.reverse()
            
            # Calculate trend statistics
            values = [item["value"] for item in trend_data]
            trend_analysis = await self._analyze_trend_statistics(values)
            
            return {
                "metric_name": metric_name,
                "period_type": period_type,
                "periods": periods,
                "data": trend_data,
                "analysis": trend_analysis
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {e}")
            raise
    
    async def compare_periods(
        self, 
        current_period: Tuple[datetime, datetime],
        comparison_period: Tuple[datetime, datetime],
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Compara métricas entre dois períodos"""
        try:
            logger.info("Comparing periods for metrics")
            
            # Calculate KPIs for both periods
            current_kpis = await self.calculate_kpis(current_period)
            comparison_kpis = await self.calculate_kpis(comparison_period)
            
            # Filter metrics if specified
            if metrics:
                current_kpis = {k: v for k, v in current_kpis.items() if k in metrics}
                comparison_kpis = {k: v for k, v in comparison_kpis.items() if k in metrics}
            
            # Compare metrics
            comparisons = {}
            for metric_name in current_kpis.keys():
                if metric_name in comparison_kpis:
                    current_value = current_kpis[metric_name].value
                    comparison_value = comparison_kpis[metric_name].value
                    
                    # Calculate change
                    change = current_value - comparison_value
                    change_percent = (change / comparison_value * 100) if comparison_value != 0 else 0
                    
                    comparisons[metric_name] = {
                        "current_value": current_value,
                        "comparison_value": comparison_value,
                        "change": change,
                        "change_percent": change_percent,
                        "trend": "up" if change > 0 else "down" if change < 0 else "stable",
                        "unit": current_kpis[metric_name].unit
                    }
            
            return {
                "current_period": {
                    "start": current_period[0].isoformat(),
                    "end": current_period[1].isoformat()
                },
                "comparison_period": {
                    "start": comparison_period[0].isoformat(),
                    "end": comparison_period[1].isoformat()
                },
                "comparisons": comparisons,
                "summary": {
                    "total_metrics": len(comparisons),
                    "improved": len([c for c in comparisons.values() if c["trend"] == "up"]),
                    "declined": len([c for c in comparisons.values() if c["trend"] == "down"]),
                    "stable": len([c for c in comparisons.values() if c["trend"] == "stable"])
                }
            }
            
        except Exception as e:
            logger.error(f"Error comparing periods: {e}")
            raise
    
    async def get_top_insights(
        self, 
        date_range: Tuple[datetime, datetime],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Obtém principais insights baseados em análises automáticas"""
        try:
            logger.info("Generating top insights")
            
            insights = []
            
            # Calculate current KPIs
            current_kpis = await self.calculate_kpis(date_range)
            
            # Compare with previous period
            period_length = date_range[1] - date_range[0]
            previous_start = date_range[0] - period_length
            previous_end = date_range[0]
            previous_kpis = await self.calculate_kpis((previous_start, previous_end))
            
            # Generate insights based on significant changes
            for metric_name, current_metric in current_kpis.items():
                if metric_name in previous_kpis:
                    previous_value = previous_kpis[metric_name].value
                    current_value = current_metric.value
                    
                    if previous_value != 0:
                        change_percent = abs((current_value - previous_value) / previous_value * 100)
                        
                        # Significant change threshold
                        if change_percent > 15:
                            trend = "increased" if current_value > previous_value else "decreased"
                            insights.append({
                                "type": "significant_change",
                                "metric": metric_name,
                                "description": f"{metric_name} {trend} by {change_percent:.1f}%",
                                "current_value": current_value,
                                "previous_value": previous_value,
                                "change_percent": change_percent,
                                "severity": "high" if change_percent > 30 else "medium",
                                "category": self.kpis[metric_name].category
                            })
            
            # Add target-based insights
            for metric_name, metric in current_kpis.items():
                kpi = self.kpis[metric_name]
                if kpi.target_value:
                    target_variance = abs((metric.value - kpi.target_value) / kpi.target_value * 100)
                    
                    if target_variance > 10:
                        status = "above" if metric.value > kpi.target_value else "below"
                        insights.append({
                            "type": "target_variance",
                            "metric": metric_name,
                            "description": f"{metric_name} is {target_variance:.1f}% {status} target",
                            "current_value": metric.value,
                            "target_value": kpi.target_value,
                            "variance_percent": target_variance,
                            "severity": "high" if target_variance > 25 else "medium",
                            "category": kpi.category
                        })
            
            # Sort by severity and limit results
            insights.sort(key=lambda x: (x["severity"] == "high", x.get("change_percent", 0)), reverse=True)
            
            return insights[:limit]
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            raise
    
    async def _define_kpis(self):
        """Define KPIs do sistema de saúde"""
        
        self.kpis = {
            # Patient Care KPIs
            "patient_satisfaction": KPI(
                name="Patient Satisfaction Score",
                category="patient_care",
                description="Average patient satisfaction rating",
                calculation="average(patient_ratings)",
                target_value=4.5,
                unit="score",
                format_type="decimal"
            ),
            "readmission_rate": KPI(
                name="30-Day Readmission Rate",
                category="patient_care",
                description="Percentage of patients readmitted within 30 days",
                calculation="percentage(readmissions_30_days)",
                target_value=10.0,
                unit="%",
                format_type="percentage"
            ),
            "average_length_stay": KPI(
                name="Average Length of Stay",
                category="patient_care",
                description="Average patient stay duration in days",
                calculation="average(stay_duration_days)",
                target_value=3.5,
                unit="days",
                format_type="decimal"
            ),
            
            # Operational KPIs
            "bed_occupancy": KPI(
                name="Bed Occupancy Rate",
                category="operational",
                description="Percentage of beds occupied",
                calculation="percentage(occupied_beds)",
                target_value=85.0,
                unit="%",
                format_type="percentage"
            ),
            "appointment_no_show": KPI(
                name="Appointment No-Show Rate",
                category="operational",
                description="Percentage of missed appointments",
                calculation="percentage(no_show_appointments)",
                target_value=5.0,
                unit="%",
                format_type="percentage"
            ),
            "emergency_wait_time": KPI(
                name="Emergency Wait Time",
                category="operational",
                description="Average wait time in emergency department",
                calculation="average(emergency_wait_minutes)",
                target_value=30.0,
                unit="minutes",
                format_type="number"
            ),
            
            # Financial KPIs
            "revenue_per_patient": KPI(
                name="Revenue per Patient",
                category="financial",
                description="Average revenue generated per patient",
                calculation="total_revenue / total_patients",
                target_value=2500.0,
                unit="$",
                format_type="currency"
            ),
            "cost_per_encounter": KPI(
                name="Cost per Encounter",
                category="financial",
                description="Average cost per patient encounter",
                calculation="total_costs / total_encounters",
                target_value=800.0,
                unit="$",
                format_type="currency"
            ),
            "collection_rate": KPI(
                name="Collection Rate",
                category="financial",
                description="Percentage of billed amounts collected",
                calculation="percentage(collected_amount / billed_amount)",
                target_value=95.0,
                unit="%",
                format_type="percentage"
            ),
            
            # Quality KPIs
            "infection_rate": KPI(
                name="Hospital Acquired Infection Rate",
                category="quality",
                description="Rate of hospital-acquired infections",
                calculation="percentage(infections / total_patients)",
                target_value=2.0,
                unit="%",
                format_type="percentage"
            ),
            "medication_errors": KPI(
                name="Medication Error Rate",
                category="quality",
                description="Rate of medication errors per 1000 patients",
                calculation="rate(medication_errors, 1000)",
                target_value=5.0,
                unit="per 1000",
                format_type="rate"
            ),
            "mortality_rate": KPI(
                name="Mortality Rate",
                category="quality",
                description="In-hospital mortality rate",
                calculation="percentage(deaths / total_admissions)",
                target_value=1.5,
                unit="%",
                format_type="percentage"
            )
        }
    
    async def _setup_metric_calculations(self):
        """Configura cálculos de métricas"""
        # This would contain the actual SQL/calculation logic for each KPI
        # For now, we'll use simulated calculations
        pass
    
    async def _calculate_kpi(
        self, 
        kpi: KPI, 
        date_range: Tuple[datetime, datetime],
        filters: Optional[Dict[str, Any]] = None
    ) -> Metric:
        """Calcula um KPI específico"""
        try:
            # Simulate KPI calculation - in production, this would query the data warehouse
            # Based on the KPI calculation formula
            
            # Mock data generation for demonstration
            import random
            base_value = random.uniform(0.8, 1.2)
            
            if kpi.name == "Patient Satisfaction Score":
                current_value = 4.2 * base_value
                previous_value = 4.1
            elif kpi.name == "30-Day Readmission Rate":
                current_value = 12.5 * base_value
                previous_value = 13.2
            elif kpi.name == "Average Length of Stay":
                current_value = 3.8 * base_value
                previous_value = 4.1
            elif kpi.name == "Bed Occupancy Rate":
                current_value = 82.5 * base_value
                previous_value = 84.2
            elif kpi.name == "Revenue per Patient":
                current_value = 2350.0 * base_value
                previous_value = 2280.0
            else:
                current_value = 100.0 * base_value
                previous_value = 95.0
            
            # Calculate change
            change_percent = ((current_value - previous_value) / previous_value * 100) if previous_value != 0 else 0
            
            # Determine trend
            if abs(change_percent) < 2:
                trend = "stable"
            elif change_percent > 0:
                trend = "up"
            else:
                trend = "down"
            
            return Metric(
                name=kpi.name,
                value=round(current_value, 2),
                previous_value=round(previous_value, 2),
                change_percent=round(change_percent, 1),
                trend=trend,
                unit=kpi.unit,
                category=kpi.category
            )
            
        except Exception as e:
            logger.error(f"Error calculating KPI {kpi.name}: {e}")
            raise
    
    async def _calculate_overall_trend(self, kpis: Dict[str, Metric]) -> str:
        """Calcula tendência geral baseada em todos os KPIs"""
        try:
            trends = [metric.trend for metric in kpis.values()]
            
            up_count = trends.count("up")
            down_count = trends.count("down")
            stable_count = trends.count("stable")
            
            total = len(trends)
            if total == 0:
                return "stable"
            
            up_percent = up_count / total * 100
            down_percent = down_count / total * 100
            
            if up_percent > 60:
                return "improving"
            elif down_percent > 60:
                return "declining"
            else:
                return "mixed"
                
        except Exception as e:
            logger.error(f"Error calculating overall trend: {e}")
            return "unknown"
    
    async def _analyze_trend_statistics(self, values: List[float]) -> Dict[str, Any]:
        """Analisa estatísticas de tendência"""
        try:
            if not values:
                return {}
            
            # Convert to numpy array for calculations
            arr = np.array(values)
            
            # Basic statistics
            statistics = {
                "mean": float(np.mean(arr)),
                "median": float(np.median(arr)),
                "std_dev": float(np.std(arr)),
                "min": float(np.min(arr)),
                "max": float(np.max(arr)),
                "variance": float(np.var(arr))
            }
            
            # Trend analysis
            if len(values) > 1:
                # Simple linear regression
                x = np.arange(len(values))
                slope, intercept = np.polyfit(x, arr, 1)
                
                statistics.update({
                    "trend_slope": float(slope),
                    "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable",
                    "trend_strength": "strong" if abs(slope) > np.std(arr) * 0.1 else "weak"
                })
            
            # Volatility
            if len(values) > 2:
                changes = np.diff(arr)
                statistics["volatility"] = float(np.std(changes))
                statistics["avg_change"] = float(np.mean(changes))
            
            return statistics
            
        except Exception as e:
            logger.error(f"Error analyzing trend statistics: {e}")
            return {}