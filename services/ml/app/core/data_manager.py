"""
Medical Data Manager for ML Pipeline

Este módulo gerencia dados médicos para treinamento e validação
de modelos de machine learning, incluindo geração de dados sintéticos
e validação de qualidade dos dados.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import json
from datetime import datetime, timedelta
import hashlib

from ..utils.logging import LoggerMixin


class MedicalDataManager(LoggerMixin):
    """
    Gerenciador de dados médicos para ML
    """
    
    def __init__(self):
        self.data_path = Path("./data")
        self.raw_path = self.data_path / "raw"
        self.processed_path = self.data_path / "processed"
        self.synthetic_path = self.data_path / "synthetic"
        
        # Create directories
        for path in [self.raw_path, self.processed_path, self.synthetic_path]:
            path.mkdir(parents=True, exist_ok=True)
    
    def generate_synthetic_medical_data(
        self, 
        n_patients: int = 10000,
        seed: int = 42
    ) -> pd.DataFrame:
        """
        Gerar dados médicos sintéticos para treinamento
        
        Args:
            n_patients: Número de pacientes a gerar
            seed: Seed para reprodutibilidade
            
        Returns:
            DataFrame com dados médicos sintéticos
        """
        np.random.seed(seed)
        self.logger.info(f"Generating {n_patients} synthetic medical records")
        
        data = []
        
        for i in range(n_patients):
            # Demographics
            age = np.random.normal(50, 15)
            age = max(18, min(90, int(age)))  # Constraint: 18-90 years
            
            gender = np.random.choice(['M', 'F'])
            
            # Vital signs with realistic correlations
            base_bp = 90 + (age - 18) * 0.8 + np.random.normal(0, 10)
            systolic_bp = max(80, min(200, int(base_bp + np.random.normal(30, 10))))
            diastolic_bp = max(50, min(120, int(base_bp + np.random.normal(10, 5))))
            
            heart_rate = int(np.random.normal(72, 12))
            heart_rate = max(50, min(120, heart_rate))
            
            temperature = np.random.normal(36.5, 0.5)
            temperature = max(35.0, min(42.0, round(temperature, 1)))
            
            # Lab results
            glucose = np.random.normal(100, 20)
            if age > 45 and np.random.random() < 0.3:  # Higher diabetes risk with age
                glucose += np.random.normal(50, 30)
            glucose = max(70, min(400, int(glucose)))
            
            cholesterol = np.random.normal(200, 40)
            if age > 50:
                cholesterol += np.random.normal(20, 15)
            cholesterol = max(120, min(350, int(cholesterol)))
            
            # BMI calculation
            height = np.random.normal(170, 10)  # cm
            height = max(150, min(200, height))
            
            bmi_base = np.random.normal(25, 4)
            weight = (bmi_base * height * height) / 10000  # kg
            bmi = round(weight / ((height/100) ** 2), 1)
            
            # Chronic conditions based on risk factors
            chronic_conditions = []
            
            # Diabetes risk
            diabetes_risk = 0.1
            if age > 45:
                diabetes_risk += 0.2
            if bmi > 30:
                diabetes_risk += 0.25
            if glucose > 126:
                diabetes_risk += 0.4
            
            if np.random.random() < diabetes_risk:
                chronic_conditions.append("diabetes")
            
            # Hypertension risk
            hypertension_risk = 0.1
            if age > 50:
                hypertension_risk += 0.3
            if systolic_bp > 140:
                hypertension_risk += 0.5
            if bmi > 25:
                hypertension_risk += 0.2
            
            if np.random.random() < hypertension_risk:
                chronic_conditions.append("hypertension")
            
            # Heart disease risk
            heart_disease_risk = 0.05
            if age > 60:
                heart_disease_risk += 0.2
            if "diabetes" in chronic_conditions:
                heart_disease_risk += 0.3
            if "hypertension" in chronic_conditions:
                heart_disease_risk += 0.25
            if cholesterol > 240:
                heart_disease_risk += 0.2
            
            if np.random.random() < heart_disease_risk:
                chronic_conditions.append("heart_disease")
            
            # Other conditions
            if np.random.random() < 0.1:
                chronic_conditions.append("asthma")
            if np.random.random() < 0.05 and age > 40:
                chronic_conditions.append("kidney_disease")
            
            # Symptoms based on conditions
            symptoms = []
            
            if "diabetes" in chronic_conditions:
                if np.random.random() < 0.6:
                    symptoms.extend(["fatigue", "thirst"])
                if np.random.random() < 0.3:
                    symptoms.append("blurred_vision")
            
            if "hypertension" in chronic_conditions:
                if np.random.random() < 0.4:
                    symptoms.extend(["headache", "dizziness"])
            
            if "heart_disease" in chronic_conditions:
                if np.random.random() < 0.7:
                    symptoms.extend(["chest_pain", "shortness_of_breath"])
            
            # Random acute symptoms
            acute_symptoms = ["fever", "cough", "nausea", "abdominal_pain"]
            for symptom in acute_symptoms:
                if np.random.random() < 0.1:
                    symptoms.append(symptom)
            
            # Risk score calculation
            risk_score = 0
            risk_score += max(0, (age - 30) * 0.5)
            risk_score += len(chronic_conditions) * 15
            risk_score += max(0, (systolic_bp - 120) * 0.3)
            risk_score += max(0, (glucose - 100) * 0.2)
            risk_score += max(0, (cholesterol - 200) * 0.1)
            risk_score += max(0, (bmi - 25) * 2)
            
            risk_score = min(100, max(0, risk_score))
            
            # Risk level
            if risk_score >= 75:
                risk_level = "critical"
            elif risk_score >= 60:
                risk_level = "high"
            elif risk_score >= 40:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Primary diagnosis based on symptoms and conditions
            if "diabetes" in chronic_conditions and glucose > 180:
                primary_diagnosis = "diabetes_uncontrolled"
            elif "hypertension" in chronic_conditions and systolic_bp > 160:
                primary_diagnosis = "hypertension_severe"
            elif "heart_disease" in chronic_conditions:
                primary_diagnosis = "cardiovascular_disease"
            elif "fever" in symptoms and "cough" in symptoms:
                primary_diagnosis = "respiratory_infection"
            elif len(symptoms) == 0 and len(chronic_conditions) == 0:
                primary_diagnosis = "healthy"
            else:
                primary_diagnosis = "routine_checkup"
            
            # Create patient record
            patient = {
                "patient_id": f"P{i:06d}",
                "age": age,
                "gender": gender,
                "height_cm": round(height, 1),
                "weight_kg": round(weight, 1),
                "bmi": bmi,
                
                # Vital signs
                "systolic_bp": systolic_bp,
                "diastolic_bp": diastolic_bp,
                "heart_rate": heart_rate,
                "temperature": temperature,
                
                # Lab results
                "glucose": glucose,
                "cholesterol": cholesterol,
                
                # Medical history
                "chronic_conditions": ",".join(chronic_conditions),
                "symptoms": ",".join(symptoms),
                
                # Outcomes
                "primary_diagnosis": primary_diagnosis,
                "risk_score": round(risk_score, 1),
                "risk_level": risk_level,
                
                # Metadata
                "record_date": (datetime.now() - timedelta(days=np.random.randint(0, 365))).isoformat(),
                "data_source": "synthetic"
            }
            
            data.append(patient)
        
        df = pd.DataFrame(data)
        
        # Save synthetic data
        output_path = self.synthetic_path / f"medical_data_{n_patients}_{seed}.csv"
        df.to_csv(output_path, index=False)
        
        self.logger.info(
            f"Generated synthetic medical data",
            patients=n_patients,
            output_path=str(output_path),
            columns=list(df.columns),
            diagnoses=df['primary_diagnosis'].value_counts().to_dict()
        )
        
        return df
    
    def prepare_training_data(
        self,
        data: pd.DataFrame,
        target_column: str,
        test_size: float = 0.2,
        validation_size: float = 0.1
    ) -> Dict[str, pd.DataFrame]:
        """
        Preparar dados para treinamento
        
        Args:
            data: DataFrame com dados
            target_column: Coluna alvo para predição
            test_size: Tamanho do conjunto de teste
            validation_size: Tamanho do conjunto de validação
            
        Returns:
            Dicionário com conjuntos train/validation/test
        """
        from sklearn.model_selection import train_test_split
        
        self.logger.info(f"Preparing training data for target: {target_column}")
        
        # Separate features and target
        X = data.drop(columns=[target_column, 'patient_id', 'record_date', 'data_source'])
        y = data[target_column]
        
        # First split: train+val vs test
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Second split: train vs validation
        val_size_adjusted = validation_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=val_size_adjusted, random_state=42, stratify=y_temp
        )
        
        result = {
            "train": pd.concat([X_train, y_train], axis=1),
            "validation": pd.concat([X_val, y_val], axis=1),
            "test": pd.concat([X_test, y_test], axis=1)
        }
        
        # Save splits
        for split_name, split_data in result.items():
            output_path = self.processed_path / f"{target_column}_{split_name}.csv"
            split_data.to_csv(output_path, index=False)
            
            self.logger.info(
                f"Saved {split_name} split",
                path=str(output_path),
                shape=split_data.shape,
                target_distribution=split_data[target_column].value_counts().to_dict()
            )
        
        return result
    
    def validate_data_quality(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Validar qualidade dos dados
        
        Args:
            data: DataFrame para validar
            
        Returns:
            Relatório de qualidade dos dados
        """
        self.logger.info("Validating data quality")
        
        report = {
            "total_records": len(data),
            "total_features": len(data.columns),
            "missing_values": {},
            "duplicates": 0,
            "outliers": {},
            "data_types": {},
            "quality_score": 0
        }
        
        # Missing values
        for column in data.columns:
            missing_count = data[column].isnull().sum()
            missing_percent = (missing_count / len(data)) * 100
            report["missing_values"][column] = {
                "count": int(missing_count),
                "percentage": round(missing_percent, 2)
            }
        
        # Duplicates
        report["duplicates"] = int(data.duplicated().sum())
        
        # Data types
        for column in data.columns:
            report["data_types"][column] = str(data[column].dtype)
        
        # Outliers for numeric columns
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        for column in numeric_columns:
            Q1 = data[column].quantile(0.25)
            Q3 = data[column].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = data[(data[column] < lower_bound) | (data[column] > upper_bound)]
            report["outliers"][column] = {
                "count": len(outliers),
                "percentage": round((len(outliers) / len(data)) * 100, 2)
            }
        
        # Calculate quality score
        missing_penalty = sum([info["percentage"] for info in report["missing_values"].values()]) / len(data.columns)
        duplicate_penalty = (report["duplicates"] / len(data)) * 100
        outlier_penalty = sum([info["percentage"] for info in report["outliers"].values()]) / len(numeric_columns) if numeric_columns.any() else 0
        
        quality_score = max(0, 100 - missing_penalty - duplicate_penalty - (outlier_penalty * 0.5))
        report["quality_score"] = round(quality_score, 2)
        
        # Save quality report
        report_path = self.processed_path / f"data_quality_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(
            "Data quality validation completed",
            quality_score=report["quality_score"],
            total_records=report["total_records"],
            missing_values_avg=round(missing_penalty, 2),
            duplicates=report["duplicates"],
            report_path=str(report_path)
        )
        
        return report
    
    def get_feature_engineering_specs(self) -> Dict[str, Dict]:
        """
        Obter especificações para feature engineering
        
        Returns:
            Especificações de features por tipo de modelo
        """
        return {
            "diagnostic": {
                "numerical_features": [
                    "age", "bmi", "systolic_bp", "diastolic_bp", 
                    "heart_rate", "temperature", "glucose", "cholesterol"
                ],
                "categorical_features": [
                    "gender"
                ],
                "text_features": [
                    "chronic_conditions", "symptoms"
                ],
                "derived_features": [
                    "age_group", "bmi_category", "bp_category", 
                    "glucose_category", "cholesterol_category"
                ]
            },
            "risk": {
                "numerical_features": [
                    "age", "bmi", "systolic_bp", "diastolic_bp",
                    "glucose", "cholesterol"
                ],
                "categorical_features": [
                    "gender"
                ],
                "text_features": [
                    "chronic_conditions", "symptoms"
                ],
                "risk_factors": [
                    "diabetes_flag", "hypertension_flag", "heart_disease_flag",
                    "age_risk", "bmi_risk", "bp_risk"
                ]
            },
            "outcome": {
                "numerical_features": [
                    "age", "bmi", "systolic_bp", "diastolic_bp",
                    "heart_rate", "glucose", "cholesterol", "risk_score"
                ],
                "categorical_features": [
                    "gender", "risk_level"
                ],
                "text_features": [
                    "chronic_conditions", "symptoms"
                ],
                "temporal_features": [
                    "days_since_diagnosis", "treatment_duration"
                ]
            }
        }
    
    def load_data(self, data_path: str) -> pd.DataFrame:
        """
        Carregar dados de arquivo
        
        Args:
            data_path: Caminho para arquivo de dados
            
        Returns:
            DataFrame com dados carregados
        """
        self.logger.info(f"Loading data from: {data_path}")
        
        path = Path(data_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        if path.suffix == '.csv':
            data = pd.read_csv(path)
        elif path.suffix == '.json':
            data = pd.read_json(path)
        elif path.suffix in ['.xlsx', '.xls']:
            data = pd.read_excel(path)
        else:
            raise ValueError(f"Unsupported file format: {path.suffix}")
        
        self.logger.info(
            f"Data loaded successfully",
            shape=data.shape,
            columns=list(data.columns)
        )
        
        return data