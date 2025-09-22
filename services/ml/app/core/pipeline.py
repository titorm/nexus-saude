"""
Core ML Pipeline for Medical Predictions

Este módulo implementa o pipeline principal de machine learning
para análise preditiva médica, incluindo processamento de dados,
treinamento de modelos e inferência.
"""

import os
import pickle
import joblib
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import numpy as np
import pandas as pd

# ML imports (will be available after pip install)
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score
except ImportError:
    # For development without dependencies
    RandomForestClassifier = None
    StandardScaler = None
    LabelEncoder = None

from ..utils.logging import LoggerMixin
from .model_trainer import MedicalModelTrainer
from .data_manager import MedicalDataManager
from .monitoring import monitor_prediction, monitor_training, monitoring


class MLPipeline(LoggerMixin):
    """
    Main ML Pipeline for medical predictions
    """
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.preprocessors: Dict[str, Any] = {}
        self.model_metadata: Dict[str, Dict] = {}
        self._is_initialized = False
        
        # Initialize trainer and data manager
        self.trainer = MedicalModelTrainer()
        self.data_manager = MedicalDataManager()
        
    async def initialize(self):
        """Initialize the ML pipeline"""
        self.logger.info("Initializing ML Pipeline")
        
        # Create necessary directories
        self._create_directories()
        
        # Initialize preprocessors
        self._initialize_preprocessors()
        
        self._is_initialized = True
        self.logger.info("ML Pipeline initialized successfully")
    
    def _create_directories(self):
        """Create necessary directories for the pipeline"""
        directories = [
            "./data/models",
            "./data/processed", 
            "./data/raw",
            "./logs"
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
            
    def _initialize_preprocessors(self):
        """Initialize data preprocessors"""
        if StandardScaler is None:
            self.logger.warning("ML dependencies not installed - using mock preprocessors")
            return
            
        self.preprocessors = {
            "scaler": StandardScaler(),
            "label_encoder": LabelEncoder(),
            "feature_selector": None  # Will be initialized during training
        }
        
    async def load_models(self):
        """Load trained models from disk"""
        model_path = Path("./data/models")
        
        if not model_path.exists():
            self.logger.warning("Model directory does not exist - no models loaded")
            return
            
        # Load available models
        model_files = {
            "diagnostic": "diagnostic_model.pkl",
            "risk": "risk_model.pkl", 
            "outcome": "outcome_model.pkl"
        }
        
        for model_name, filename in model_files.items():
            file_path = model_path / filename
            
            if file_path.exists():
                try:
                    self.models[model_name] = joblib.load(file_path)
                    
                    self.logger.info(f"Model loaded: {model_name}")
                    
                    # Load metadata if available
                    metadata_path = model_path / f"{model_name}_metadata.json"
                    if metadata_path.exists():
                        import json
                        with open(metadata_path, 'r') as f:
                            self.model_metadata[model_name] = json.load(f)
                            
                except Exception as e:
                    self.logger.error(f"Failed to load model {model_name}: {str(e)}")
            else:
                self.logger.info(f"Model file not found: {filename}")
                
        self.logger.info(f"Loaded {len(self.models)} models")
    
    @monitor_prediction("diagnostic")
    async def predict_diagnosis(self, patient_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict possible diagnoses for a patient using real ML models
        
        Args:
            patient_features: Patient feature dictionary
            
        Returns:
            Prediction result with diagnoses and confidence scores
        """
        try:
            # Generate training data if no model exists
            if "diagnostic" not in self.models:
                self.logger.info("No diagnostic model found, training new model...")
                
                # Generate synthetic training data
                training_data = self.data_manager.generate_synthetic_medical_data(n_patients=2000)
                
                # Train diagnostic model
                training_result = self.trainer.train_model(
                    model_type="diagnostic",
                    data=training_data,
                    model_name="random_forest"
                )
                
                if training_result["training_completed"]:
                    # Load the trained model using joblib
                    model_path = Path(training_result["model_path"])
                    self.models["diagnostic"] = joblib.load(model_path)
                    
                    self.model_metadata["diagnostic"] = {
                        "algorithm": "random_forest",
                        "version": "1.0",
                        "training_date": datetime.now().isoformat(),
                        "metrics": training_result["metrics"],
                        "data_size": len(training_data)
                    }
                    
                    self.logger.info("Diagnostic model trained and loaded successfully")
                else:
                    return self._mock_diagnostic_prediction(patient_features)
            
            # Use trained model for prediction
            model = self.models["diagnostic"]
            metadata = self.model_metadata.get("diagnostic", {})
            
            # Preprocess features for the model
            processed_features = self._preprocess_diagnostic_features(patient_features)
            
            # Make prediction
            prediction_proba = model.predict_proba(processed_features)[0]
            prediction_class = model.predict(processed_features)[0]
            
            # Map prediction to medical conditions
            diagnoses = self._map_diagnostic_predictions(prediction_proba, prediction_class)
            
            result = {
                "patient_id": patient_features.get("patient_id", "unknown"),
                "predictions": diagnoses,
                "model_info": {
                    "algorithm": metadata.get("algorithm", "random_forest"),
                    "version": metadata.get("version", "1.0"),
                    "confidence_threshold": 0.6
                },
                "processing_info": {
                    "timestamp": datetime.now().isoformat(),
                    "features_used": len(processed_features.columns),
                    "model_training_size": metadata.get("data_size", "unknown")
                }
            }
            
            self.logger.info(
                "Diagnostic prediction completed",
                patient_id=result["patient_id"],
                top_prediction=diagnoses[0]["condition"] if diagnoses else "none",
                confidence=diagnoses[0]["confidence"] if diagnoses else 0
            )
            
            return result
            
        except Exception as e:
            self.logger.error("Failed to make diagnostic prediction", error=str(e))
            # Fallback to mock prediction
            return self._mock_diagnostic_prediction(patient_features)
            
            # Format results
            results = []
            for i, idx in enumerate(top_indices):
                results.append({
                    "diagnosis": model.classes_[idx],
                    "probability": float(predictions[idx]),
                    "confidence": self._calculate_confidence(predictions[idx]),
                    "rank": i + 1
                })
            
            return {
                "model_type": "diagnostic",
                "model_version": self.model_metadata.get("diagnostic", {}).get("version", "1.0"),
                "predictions": results,
                "primary_prediction": results[0]["diagnosis"] if results else None,
                "overall_confidence": float(np.max(predictions)),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Diagnostic prediction failed: {str(e)}")
            raise
            
    @monitor_prediction("risk")
    async def assess_risk(self, patient_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess medical risk for a patient using real ML models
        
        Args:
            patient_features: Patient feature dictionary
            
        Returns:
            Risk assessment result
        """
        try:
            # Generate training data if no model exists
            if "risk" not in self.models:
                self.logger.info("No risk assessment model found, training new model...")
                
                # Generate synthetic training data
                training_data = self.data_manager.generate_synthetic_medical_data(n_patients=1500)
                
                # Train risk assessment model
                training_result = self.trainer.train_model(
                    model_type="risk",
                    data=training_data,
                    model_name="gradient_boosting"
                )
                
                if training_result["training_completed"]:
                    # Load the trained model using joblib
                    model_path = Path(training_result["model_path"])
                    self.models["risk"] = joblib.load(model_path)
                    
                    self.model_metadata["risk"] = {
                        "algorithm": "gradient_boosting",
                        "version": "1.0",
                        "training_date": datetime.now().isoformat(),
                        "metrics": training_result["metrics"],
                        "data_size": len(training_data)
                    }
                    
                    self.logger.info("Risk assessment model trained and loaded successfully")
                else:
                    return self._mock_risk_assessment(patient_features)
            
            # Use trained model for prediction
            model = self.models["risk"]
            metadata = self.model_metadata.get("risk", {})
            
            # Preprocess features for the model
            processed_features = self._preprocess_risk_features(patient_features)
            
            # Make risk prediction
            risk_probability = model.predict_proba(processed_features)[0]
            risk_class = model.predict(processed_features)[0]
            
            # Calculate risk score (0-100)
            risk_score = float(np.max(risk_probability) * 100)
            
            # Map to risk categories
            risk_assessment = self._map_risk_predictions(risk_probability, risk_class, risk_score)
            
            # Generate recommendations
            recommendations = self._generate_risk_recommendations(
                risk_assessment["risk_level"], 
                risk_assessment["risk_factors"]
            )
            
            result = {
                "patient_id": patient_features.get("patient_id", "unknown"),
                "risk_assessment": risk_assessment,
                "recommendations": recommendations,
                "model_info": {
                    "algorithm": metadata.get("algorithm", "gradient_boosting"),
                    "version": metadata.get("version", "1.0"),
                    "risk_threshold": 0.6
                },
                "processing_info": {
                    "timestamp": datetime.now().isoformat(),
                    "features_used": len(processed_features.columns),
                    "model_training_size": metadata.get("data_size", "unknown")
                }
            }
            
            self.logger.info(
                "Risk assessment completed",
                patient_id=result["patient_id"],
                risk_level=risk_assessment["risk_level"],
                risk_score=risk_score
            )
            
            return result
            
        except Exception as e:
            self.logger.error("Failed to make risk assessment", error=str(e))
            # Fallback to mock prediction
            return self._mock_risk_assessment(patient_features)
            
        try:
            # Preprocess features
            processed_features = self._preprocess_features(patient_features)
            
            # Make prediction
            model = self.models["risk"]
            risk_score = model.predict([processed_features])[0]
            risk_proba = model.predict_proba([processed_features])[0] if hasattr(model, 'predict_proba') else None
            
            # Calculate risk level
            risk_level = self._calculate_risk_level(risk_score)
            
            # Identify risk factors
            risk_factors = self._identify_risk_factors(patient_features, processed_features)
            
            return {
                "model_type": "risk",
                "model_version": self.model_metadata.get("risk", {}).get("version", "1.0"),
                "risk_score": float(risk_score),
                "risk_level": risk_level,
                "risk_factors": risk_factors,
                "confidence": float(np.max(risk_proba)) if risk_proba is not None else 0.8,
                "recommendations": self._generate_risk_recommendations(risk_level, risk_factors),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Risk assessment failed: {str(e)}")
            raise
            
    def _preprocess_features(self, patient_features: Dict[str, Any]) -> List[float]:
        """
        Preprocess patient features for ML model input
        
        Args:
            patient_features: Raw patient features
            
        Returns:
            Processed feature vector
        """
        # Extract numerical features
        features = []
        
        # Demographics
        features.append(patient_features.get("age", 0))
        features.append(1 if patient_features.get("gender") == "M" else 0)
        
        # Vital signs
        vital_signs = patient_features.get("vital_signs", {})
        features.extend([
            vital_signs.get("temperature", 36.5),
            vital_signs.get("heart_rate", 70),
            vital_signs.get("blood_pressure", {}).get("systolic", 120),
            vital_signs.get("blood_pressure", {}).get("diastolic", 80)
        ])
        
        # Symptoms (binary encoding)
        common_symptoms = [
            "fever", "cough", "headache", "nausea", "fatigue",
            "chest_pain", "shortness_of_breath", "dizziness"
        ]
        
        patient_symptoms = patient_features.get("symptoms", [])
        for symptom in common_symptoms:
            features.append(1 if symptom in patient_symptoms else 0)
            
        # Chronic conditions (binary encoding)
        common_conditions = [
            "diabetes", "hypertension", "heart_disease", "asthma",
            "kidney_disease", "liver_disease", "cancer"
        ]
        
        patient_conditions = patient_features.get("chronic_conditions", [])
        for condition in common_conditions:
            features.append(1 if condition in patient_conditions else 0)
            
        return features
    
    def _calculate_confidence(self, probability: float) -> str:
        """Calculate confidence level from probability"""
        if probability >= 0.8:
            return "high"
        elif probability >= 0.6:
            return "medium"
        else:
            return "low"
            
    def _calculate_risk_level(self, risk_score: float) -> str:
        """Calculate risk level from risk score"""
        if risk_score >= 80:
            return "critical"
        elif risk_score >= 60:
            return "high"
        elif risk_score >= 40:
            return "medium"
        else:
            return "low"
            
    def _identify_risk_factors(self, patient_features: Dict, processed_features: List) -> List[str]:
        """Identify specific risk factors for the patient"""
        risk_factors = []
        
        age = patient_features.get("age", 0)
        if age > 65:
            risk_factors.append("Advanced age (>65)")
            
        # Check vital signs (handle None case)
        vital_signs = patient_features.get("vital_signs") or {}
        bp = vital_signs.get("blood_pressure") or {}
        
        if bp.get("systolic", 0) > 140:
            risk_factors.append("Elevated blood pressure")
            
        if vital_signs.get("heart_rate", 0) > 100:
            risk_factors.append("Tachycardia")
            
        # Check chronic conditions
        high_risk_conditions = ["diabetes", "heart_disease", "kidney_disease"]
        patient_conditions = patient_features.get("chronic_conditions", [])
        
        for condition in high_risk_conditions:
            if condition in patient_conditions:
                risk_factors.append(f"History of {condition}")
                
        return risk_factors
        
    def _generate_risk_recommendations(self, risk_level: str, risk_factors: List[str]) -> List[str]:
        """Generate recommendations based on risk assessment"""
        recommendations = []
        
        if risk_level == "critical":
            recommendations.extend([
                "Immediate medical attention required",
                "Consider emergency department evaluation",
                "Continuous monitoring recommended"
            ])
        elif risk_level == "high":
            recommendations.extend([
                "Close medical supervision required",
                "Frequent follow-up appointments",
                "Consider specialist referral"
            ])
        elif risk_level == "medium":
            recommendations.extend([
                "Regular monitoring recommended",
                "Follow-up in 1-2 weeks",
                "Lifestyle modifications advised"
            ])
        else:
            recommendations.extend([
                "Routine monitoring sufficient",
                "Maintain healthy lifestyle",
                "Annual check-ups recommended"
            ])
            
        return recommendations
    
    def _preprocess_diagnostic_features(self, patient_features: Dict[str, Any]) -> pd.DataFrame:
        """
        Preprocess patient features for diagnostic model using same logic as training
        
        Args:
            patient_features: Raw patient features
            
        Returns:
            Processed feature DataFrame matching training data format
        """
        # Convert patient features to DataFrame format matching training data
        data = {
            'age': [patient_features.get("age", 45)],
            'gender': [patient_features.get("gender", "M")],
            'height_cm': [170],  # Default values
            'weight_kg': [70],
            'bmi': [patient_features.get("bmi", 25)],
            'systolic_bp': [patient_features.get("vital_signs", {}).get("blood_pressure", {}).get("systolic", 120)],
            'diastolic_bp': [patient_features.get("vital_signs", {}).get("blood_pressure", {}).get("diastolic", 80)],
            'heart_rate': [patient_features.get("vital_signs", {}).get("heart_rate", 70)],
            'temperature': [patient_features.get("vital_signs", {}).get("temperature", 36.5)],
            'glucose': [patient_features.get("lab_results", {}).get("glucose", 100)],
            'cholesterol': [patient_features.get("lab_results", {}).get("cholesterol", 180)],
            'chronic_conditions': [','.join(patient_features.get("chronic_conditions", []))],
            'symptoms': [','.join(patient_features.get("symptoms", []))],
            'risk_score': [50],  # Default
            'risk_level': ['medium']  # Default
        }
        
        df = pd.DataFrame(data)
        
        # Use the same feature engineering as training
        processed_features = self.trainer._engineer_features(df, "diagnostic")
        
        # Return as DataFrame (will have correct column names for ColumnTransformer)
        return processed_features
    
    def _map_diagnostic_predictions(self, prediction_proba: np.ndarray, prediction_class: int) -> List[Dict[str, Any]]:
        """
        Map model predictions to medical conditions
        
        Args:
            prediction_proba: Prediction probabilities
            prediction_class: Predicted class
            
        Returns:
            List of possible diagnoses with confidence scores
        """
        # Medical conditions mapped to prediction classes
        conditions = [
            "Healthy/Normal",
            "Viral Infection", 
            "Bacterial Infection",
            "Cardiovascular Disease",
            "Respiratory Condition",
            "Gastrointestinal Issue",
            "Neurological Condition",
            "Metabolic Disorder",
            "Inflammatory Condition",
            "Other Condition"
        ]
        
        # Get top 5 predictions
        top_indices = np.argsort(prediction_proba)[-5:][::-1]
        
        diagnoses = []
        for i, idx in enumerate(top_indices):
            if idx < len(conditions) and prediction_proba[idx] > 0.1:  # Minimum confidence
                diagnoses.append({
                    "condition": conditions[idx],
                    "confidence": float(prediction_proba[idx]),
                    "rank": i + 1,
                    "severity": self._assess_severity(conditions[idx], prediction_proba[idx])
                })
        
        return diagnoses
    
    def _assess_severity(self, condition: str, confidence: float) -> str:
        """Assess severity based on condition and confidence"""
        high_severity_conditions = [
            "Cardiovascular Disease", 
            "Neurological Condition",
            "Bacterial Infection"
        ]
        
        if condition in high_severity_conditions and confidence > 0.7:
            return "high"
        elif confidence > 0.6:
            return "medium"
        else:
            return "low"
    
    def _preprocess_risk_features(self, patient_features: Dict[str, Any]) -> pd.DataFrame:
        """
        Preprocess patient features for risk assessment model using same logic as training
        
        Args:
            patient_features: Raw patient features
            
        Returns:
            Processed feature DataFrame matching training data format
        """
        # Convert patient features to DataFrame format matching training data
        data = {
            'age': [patient_features.get("age", 45)],
            'gender': [patient_features.get("gender", "M")],
            'height_cm': [170],  # Default values
            'weight_kg': [70],
            'bmi': [patient_features.get("bmi", 25)],
            'systolic_bp': [patient_features.get("vital_signs", {}).get("blood_pressure", {}).get("systolic", 120)],
            'diastolic_bp': [patient_features.get("vital_signs", {}).get("blood_pressure", {}).get("diastolic", 80)],
            'heart_rate': [patient_features.get("vital_signs", {}).get("heart_rate", 70)],
            'temperature': [patient_features.get("vital_signs", {}).get("temperature", 36.5)],
            'glucose': [patient_features.get("lab_results", {}).get("glucose", 100)],
            'cholesterol': [patient_features.get("lab_results", {}).get("cholesterol", 180)],
            'chronic_conditions': [','.join(patient_features.get("chronic_conditions", []))],
            'symptoms': [','.join(patient_features.get("symptoms", []))],
            'primary_diagnosis': ['routine_checkup'],  # Default
            'risk_score': [50],  # Default
        }
        
        df = pd.DataFrame(data)
        
        # Use the same feature engineering as training
        processed_features = self.trainer._engineer_features(df, "risk")
        
        # Return as DataFrame (will have correct column names for ColumnTransformer)
        return processed_features
    
    def _map_risk_predictions(self, risk_probability: np.ndarray, risk_class: int, risk_score: float) -> Dict[str, Any]:
        """
        Map risk model predictions to risk assessment
        
        Args:
            risk_probability: Risk probabilities
            risk_class: Predicted risk class
            risk_score: Calculated risk score
            
        Returns:
            Risk assessment dictionary
        """
        # Risk categories
        risk_categories = [
            "Low Risk",
            "Moderate Risk", 
            "High Risk",
            "Critical Risk"
        ]
        
        # Determine risk level based on score
        if risk_score >= 80:
            risk_level = "critical"
        elif risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "moderate"
        else:
            risk_level = "low"
        
        # Get primary risk category
        # risk_class comes as string from the model (e.g., "low", "medium", "high", "critical")
        if isinstance(risk_class, str):
            risk_class_map = {
                "low": 0,
                "medium": 1, 
                "high": 2,
                "critical": 3
            }
            risk_class_index = risk_class_map.get(risk_class.lower(), 0)
        else:
            risk_class_index = int(risk_class)
        
        primary_risk = risk_categories[min(risk_class_index, len(risk_categories) - 1)]
        
        # Calculate confidence
        confidence = float(np.max(risk_probability))
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "primary_risk": primary_risk,
            "confidence": confidence,
            "risk_factors": self._identify_specific_risk_factors(risk_probability, risk_score)
        }
    
    def _identify_specific_risk_factors(self, risk_probability: np.ndarray, risk_score: float) -> List[str]:
        """Identify specific risk factors based on model predictions"""
        risk_factors = []
        
        if risk_score > 60:
            risk_factors.append("Multiple risk factors present")
        
        if risk_score > 40:
            risk_factors.append("Chronic condition detected")
            
        if risk_score > 30:
            risk_factors.append("Lifestyle risk factors")
            
        # High confidence in high risk class
        if len(risk_probability) > 2 and risk_probability[2] > 0.6:
            risk_factors.append("Elevated cardiovascular risk")
            
        if len(risk_probability) > 3 and risk_probability[3] > 0.5:
            risk_factors.append("Critical health indicators")
        
        return risk_factors if risk_factors else ["Standard risk profile"]
        
    # Mock prediction methods (fallback for development)
    
    def _mock_diagnostic_prediction(self, patient_features: Dict[str, Any]) -> Dict[str, Any]:
        """Mock diagnostic prediction for development"""
        import random
        
        mock_diagnoses = [
            "Upper respiratory infection",
            "Viral syndrome", 
            "Hypertension",
            "Gastroenteritis",
            "Anxiety disorder"
        ]
        
        # Generate mock predictions with decreasing probabilities
        predictions = []
        for i, diagnosis in enumerate(mock_diagnoses):
            probability = random.uniform(0.1, 0.9) * (0.8 ** i)
            predictions.append({
                "diagnosis": diagnosis,
                "probability": probability,
                "confidence": self._calculate_confidence(probability),
                "rank": i + 1
            })
            
        # Sort by probability
        predictions.sort(key=lambda x: x["probability"], reverse=True)
        
        return {
            "model_type": "diagnostic",
            "model_version": "mock-1.0",
            "predictions": predictions,
            "primary_prediction": predictions[0]["diagnosis"],
            "overall_confidence": predictions[0]["probability"],
            "timestamp": datetime.now().isoformat()
        }
        
    def _mock_risk_assessment(self, patient_features: Dict[str, Any]) -> Dict[str, Any]:
        """Mock risk assessment for development"""
        import random
        
        self.logger.info(f"_mock_risk_assessment called with: {patient_features}")
        
        # Generate mock risk score based on age and conditions
        base_risk = 20
        age = patient_features.get("age", 30)
        self.logger.info(f"Age extracted: {age}")
        
        if age > 65:
            base_risk += 30
        elif age > 50:
            base_risk += 15
            
        chronic_conditions = patient_features.get("chronic_conditions", [])
        self.logger.info(f"Chronic conditions: {chronic_conditions}")
        base_risk += len(chronic_conditions) * 10
        
        # Add some randomness
        risk_score = min(100, base_risk + random.randint(-10, 20))
        risk_level = self._calculate_risk_level(risk_score)
        self.logger.info(f"Risk score: {risk_score}, Risk level: {risk_level}")
        
        # Mock risk factors
        try:
            risk_factors = self._identify_risk_factors(patient_features, [])
            self.logger.info(f"Risk factors identified: {risk_factors}")
        except Exception as e:
            self.logger.error(f"Error identifying risk factors: {e}")
            risk_factors = ["Unable to assess risk factors"]
        
        return {
            "model_type": "risk",
            "model_version": "mock-1.0",
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "confidence": 0.8,
            "recommendations": self._generate_risk_recommendations(risk_level, risk_factors),
            "timestamp": datetime.now().isoformat()
        }
        
    async def cleanup(self):
        """Cleanup resources"""
        self.logger.info("Cleaning up ML Pipeline")
        self.models.clear()
        self.preprocessors.clear()
        self.model_metadata.clear()
        self._is_initialized = False
        
    @property
    def is_initialized(self) -> bool:
        """Check if pipeline is initialized"""
        return self._is_initialized
        
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            "models_loaded": list(self.models.keys()),
            "total_models": len(self.models),
            "metadata": self.model_metadata,
            "initialized": self._is_initialized
        }