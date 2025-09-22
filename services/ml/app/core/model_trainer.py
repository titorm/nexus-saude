"""
Model Trainer for Medical ML Models

Este módulo implementa treinamento de modelos de machine learning
para diagnóstico médico, avaliação de risco e predição de outcomes.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any, Union
from pathlib import Path
import joblib
import json
from datetime import datetime
import pickle

from ..utils.logging import LoggerMixin
from .data_manager import MedicalDataManager

try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.svm import SVC
    from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
    from sklearn.model_selection import cross_val_score, GridSearchCV
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        roc_auc_score, confusion_matrix, classification_report
    )
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class MedicalModelTrainer(LoggerMixin):
    """
    Trainer para modelos de ML médicos
    """
    
    def __init__(self):
        self.data_manager = MedicalDataManager()
        self.models_path = Path("./data/models")
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        self.trained_models = {}
        self.model_metadata = {}
        
        # Model configurations
        self.model_configs = {
            "diagnostic": {
                "target_column": "primary_diagnosis",
                "models": {
                    "random_forest": RandomForestClassifier,
                    "gradient_boosting": GradientBoostingClassifier,
                    "logistic_regression": LogisticRegression
                },
                "hyperparameters": {
                    "random_forest": {
                        "n_estimators": [100, 200],
                        "max_depth": [10, 20, None],
                        "min_samples_split": [2, 5]
                    },
                    "gradient_boosting": {
                        "n_estimators": [100, 200],
                        "learning_rate": [0.1, 0.01],
                        "max_depth": [3, 5]
                    },
                    "logistic_regression": {
                        "C": [0.1, 1.0, 10.0],
                        "max_iter": [1000]
                    }
                }
            },
            "risk": {
                "target_column": "risk_level",
                "models": {
                    "random_forest": RandomForestClassifier,
                    "gradient_boosting": GradientBoostingClassifier
                },
                "hyperparameters": {
                    "random_forest": {
                        "n_estimators": [100, 200],
                        "max_depth": [10, 15],
                        "min_samples_split": [2, 5]
                    },
                    "gradient_boosting": {
                        "n_estimators": [100, 150],
                        "learning_rate": [0.1, 0.05],
                        "max_depth": [3, 5]
                    }
                }
            }
        }
    
    def prepare_features(
        self, 
        data: pd.DataFrame, 
        model_type: str
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Preparar features para treinamento
        
        Args:
            data: DataFrame com dados
            model_type: Tipo de modelo (diagnostic, risk, outcome)
            
        Returns:
            Tuple (features, target)
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for model training")
        
        self.logger.info(f"Preparing features for {model_type} model")
        
        config = self.model_configs[model_type]
        target_column = config["target_column"]
        
        # Separate target
        y = data[target_column]
        
        # Prepare feature columns
        feature_columns = [
            col for col in data.columns 
            if col not in [target_column, 'patient_id', 'record_date', 'data_source']
        ]
        
        X = data[feature_columns].copy()
        
        # Feature engineering
        X = self._engineer_features(X, model_type)
        
        self.logger.info(
            f"Features prepared",
            feature_count=len(X.columns),
            target_classes=y.value_counts().to_dict(),
            sample_count=len(X)
        )
        
        return X, y
    
    def _engineer_features(self, X: pd.DataFrame, model_type: str) -> pd.DataFrame:
        """
        Aplicar feature engineering
        
        Args:
            X: Features originais
            model_type: Tipo de modelo
            
        Returns:
            Features processadas
        """
        X_processed = X.copy()
        
        # Convert text columns to binary features
        if 'chronic_conditions' in X_processed.columns:
            conditions = ['diabetes', 'hypertension', 'heart_disease', 'asthma', 'kidney_disease']
            for condition in conditions:
                X_processed[f'has_{condition}'] = X_processed['chronic_conditions'].str.contains(
                    condition, na=False
                ).astype(int)
            X_processed.drop('chronic_conditions', axis=1, inplace=True)
        
        if 'symptoms' in X_processed.columns:
            symptoms = ['fever', 'cough', 'fatigue', 'chest_pain', 'shortness_of_breath', 'headache']
            for symptom in symptoms:
                X_processed[f'has_{symptom}'] = X_processed['symptoms'].str.contains(
                    symptom, na=False
                ).astype(int)
            X_processed.drop('symptoms', axis=1, inplace=True)
        
        # Encode categorical variables
        if 'gender' in X_processed.columns:
            X_processed['gender_male'] = (X_processed['gender'] == 'M').astype(int)
            X_processed.drop('gender', axis=1, inplace=True)
        
        # Encode risk_level categorical variable
        if 'risk_level' in X_processed.columns:
            X_processed['risk_level_low'] = (X_processed['risk_level'] == 'low').astype(int)
            X_processed['risk_level_medium'] = (X_processed['risk_level'] == 'medium').astype(int)
            X_processed['risk_level_high'] = (X_processed['risk_level'] == 'high').astype(int)
            X_processed['risk_level_critical'] = (X_processed['risk_level'] == 'critical').astype(int)
            X_processed.drop('risk_level', axis=1, inplace=True)
        
        # Encode primary_diagnosis categorical variable
        if 'primary_diagnosis' in X_processed.columns:
            # Define all possible diagnoses (ensure consistency between training and prediction)
            all_diagnoses = [
                'routine_checkup', 'cardiovascular_disease', 'hypertension_severe', 
                'healthy', 'diabetes_uncontrolled', 'respiratory_infection'
            ]
            
            for diagnosis in all_diagnoses:
                safe_name = diagnosis.replace(' ', '_').replace('-', '_').lower()
                X_processed[f'diagnosis_{safe_name}'] = (X_processed['primary_diagnosis'] == diagnosis).astype(int)
            
            X_processed.drop('primary_diagnosis', axis=1, inplace=True)
        
        # Handle any remaining object/string columns
        for col in X_processed.select_dtypes(include=['object']).columns:
            self.logger.warning(f"Found categorical column '{col}' with values: {X_processed[col].unique()[:5]}")
            # Try to convert to numeric, if fails, create dummy variables
            try:
                X_processed[col] = pd.to_numeric(X_processed[col], errors='coerce')
            except:
                # Create dummy variables for remaining categorical columns
                unique_vals = X_processed[col].dropna().unique()
                for val in unique_vals:
                    if pd.notna(val):
                        safe_name = str(val).replace(' ', '_').replace('-', '_').lower()
                        X_processed[f'{col}_{safe_name}'] = (X_processed[col] == val).astype(int)
                X_processed.drop(col, axis=1, inplace=True)
        
        # Create derived features
        if 'age' in X_processed.columns:
            X_processed['age_group_young'] = (X_processed['age'] < 30).astype(int)
            X_processed['age_group_middle'] = ((X_processed['age'] >= 30) & (X_processed['age'] < 60)).astype(int)
            X_processed['age_group_elderly'] = (X_processed['age'] >= 60).astype(int)
        
        if 'bmi' in X_processed.columns:
            X_processed['bmi_underweight'] = (X_processed['bmi'] < 18.5).astype(int)
            X_processed['bmi_normal'] = ((X_processed['bmi'] >= 18.5) & (X_processed['bmi'] < 25)).astype(int)
            X_processed['bmi_overweight'] = ((X_processed['bmi'] >= 25) & (X_processed['bmi'] < 30)).astype(int)
            X_processed['bmi_obese'] = (X_processed['bmi'] >= 30).astype(int)
        
        if 'systolic_bp' in X_processed.columns:
            X_processed['bp_normal'] = (X_processed['systolic_bp'] < 120).astype(int)
            X_processed['bp_elevated'] = ((X_processed['systolic_bp'] >= 120) & (X_processed['systolic_bp'] < 140)).astype(int)
            X_processed['bp_high'] = (X_processed['systolic_bp'] >= 140).astype(int)
        
        if 'glucose' in X_processed.columns:
            X_processed['glucose_normal'] = (X_processed['glucose'] < 100).astype(int)
            X_processed['glucose_prediabetic'] = ((X_processed['glucose'] >= 100) & (X_processed['glucose'] < 126)).astype(int)
            X_processed['glucose_diabetic'] = (X_processed['glucose'] >= 126).astype(int)
        
        # Fill missing values
        X_processed = X_processed.fillna(X_processed.mean())
        
        return X_processed
    
    def train_model(
        self,
        model_type: str,
        data: pd.DataFrame,
        model_name: str = "random_forest",
        use_grid_search: bool = True
    ) -> Dict[str, Any]:
        """
        Treinar modelo de ML
        
        Args:
            model_type: Tipo de modelo (diagnostic, risk)
            data: Dados de treinamento
            model_name: Nome do algoritmo a usar
            use_grid_search: Se deve usar grid search para otimização
            
        Returns:
            Resultados do treinamento
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for model training")
        
        self.logger.info(f"Starting {model_type} model training with {model_name}")
        
        # Prepare data
        X, y = self.prepare_features(data, model_type)
        
        # Split data
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Get model class and hyperparameters
        config = self.model_configs[model_type]
        ModelClass = config["models"][model_name]
        hyperparams = config["hyperparameters"][model_name]
        
        # Create preprocessing pipeline
        numerical_features = X.select_dtypes(include=[np.number]).columns.tolist()
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numerical_features)
            ],
            remainder='passthrough'
        )
        
        # Create model pipeline
        if use_grid_search:
            # Grid search for hyperparameter optimization
            pipeline = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', ModelClass(random_state=42))
            ])
            
            # Adjust hyperparameter names for pipeline
            param_grid = {
                f'classifier__{param}': values
                for param, values in hyperparams.items()
            }
            
            grid_search = GridSearchCV(
                pipeline,
                param_grid,
                cv=5,
                scoring='accuracy',
                n_jobs=-1,
                verbose=1
            )
            
            grid_search.fit(X_train, y_train)
            best_model = grid_search.best_estimator_
            best_params = grid_search.best_params_
            
            self.logger.info(f"Best parameters found: {best_params}")
            
        else:
            # Use default parameters
            pipeline = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', ModelClass(random_state=42))
            ])
            
            pipeline.fit(X_train, y_train)
            best_model = pipeline
            best_params = {}
        
        # Make predictions
        y_pred_train = best_model.predict(X_train)
        y_pred_test = best_model.predict(X_test)
        y_pred_proba_test = best_model.predict_proba(X_test)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_test, y_pred_test, y_pred_proba_test)
        
        # Feature importance (if available)
        feature_importance = {}
        if hasattr(best_model.named_steps['classifier'], 'feature_importances_'):
            importance_values = best_model.named_steps['classifier'].feature_importances_
            feature_names = numerical_features  # Simplified for now
            feature_importance = dict(zip(feature_names[:len(importance_values)], importance_values))
        
        # Save model
        model_filename = f"{model_type}_{model_name}_model.pkl"
        model_path = self.models_path / model_filename
        
        joblib.dump(best_model, model_path)
        
        # Store in memory
        self.trained_models[model_type] = best_model
        
        # Create metadata
        metadata = {
            "model_type": model_type,
            "algorithm": model_name,
            "training_date": datetime.now().isoformat(),
            "model_path": str(model_path),
            "metrics": metrics,
            "feature_importance": feature_importance,
            "best_parameters": best_params,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features": X.columns.tolist(),
            "target_classes": y.unique().tolist()
        }
        
        # Save metadata
        metadata_path = self.models_path / f"{model_type}_{model_name}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
        
        self.model_metadata[model_type] = metadata
        
        self.logger.info(
            f"Model training completed",
            model_type=model_type,
            algorithm=model_name,
            accuracy=metrics["accuracy"],
            f1_score=metrics["f1_score"],
            model_path=str(model_path)
        )
        
        return {
            "model_type": model_type,
            "algorithm": model_name,
            "metrics": metrics,
            "model_path": str(model_path),
            "metadata_path": str(metadata_path),
            "training_completed": True
        }
    
    def _calculate_metrics(
        self, 
        y_true: np.ndarray, 
        y_pred: np.ndarray, 
        y_pred_proba: np.ndarray
    ) -> Dict[str, float]:
        """
        Calcular métricas de avaliação
        
        Args:
            y_true: Valores verdadeiros
            y_pred: Predições
            y_pred_proba: Probabilidades das predições
            
        Returns:
            Dicionário com métricas
        """
        metrics = {}
        
        # Basic metrics
        metrics["accuracy"] = accuracy_score(y_true, y_pred)
        metrics["precision"] = precision_score(y_true, y_pred, average='weighted', zero_division=0)
        metrics["recall"] = recall_score(y_true, y_pred, average='weighted', zero_division=0)
        metrics["f1_score"] = f1_score(y_true, y_pred, average='weighted', zero_division=0)
        
        # AUC-ROC for binary/multiclass
        try:
            if len(np.unique(y_true)) == 2:
                # Binary classification
                metrics["auc_roc"] = roc_auc_score(y_true, y_pred_proba[:, 1])
            else:
                # Multiclass
                metrics["auc_roc"] = roc_auc_score(y_true, y_pred_proba, multi_class='ovr', average='weighted')
        except Exception as e:
            self.logger.warning(f"Could not calculate AUC-ROC: {e}")
            metrics["auc_roc"] = 0.0
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        metrics["confusion_matrix"] = cm.tolist()
        
        return metrics
    
    def evaluate_model(
        self,
        model_type: str,
        test_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Avaliar modelo treinado
        
        Args:
            model_type: Tipo de modelo
            test_data: Dados de teste
            
        Returns:
            Resultados da avaliação
        """
        if model_type not in self.trained_models:
            raise ValueError(f"No trained model found for type: {model_type}")
        
        self.logger.info(f"Evaluating {model_type} model")
        
        model = self.trained_models[model_type]
        
        # Prepare test data
        X_test, y_test = self.prepare_features(test_data, model_type)
        
        # Make predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_test, y_pred, y_pred_proba)
        
        # Classification report
        class_report = classification_report(y_test, y_pred, output_dict=True)
        
        evaluation_result = {
            "model_type": model_type,
            "evaluation_date": datetime.now().isoformat(),
            "test_samples": len(X_test),
            "metrics": metrics,
            "classification_report": class_report,
            "predictions_sample": {
                "actual": y_test[:10].tolist(),
                "predicted": y_pred[:10].tolist(),
                "probabilities": y_pred_proba[:10].tolist()
            }
        }
        
        # Save evaluation report
        eval_path = self.models_path / f"{model_type}_evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(eval_path, 'w') as f:
            json.dump(evaluation_result, f, indent=2, default=str)
        
        self.logger.info(
            f"Model evaluation completed",
            model_type=model_type,
            accuracy=metrics["accuracy"],
            f1_score=metrics["f1_score"],
            eval_path=str(eval_path)
        )
        
        return evaluation_result
    
    def load_trained_model(self, model_type: str, model_path: str) -> bool:
        """
        Carregar modelo treinado
        
        Args:
            model_type: Tipo de modelo
            model_path: Caminho para o modelo
            
        Returns:
            True se carregado com sucesso
        """
        try:
            model = joblib.load(model_path)
            self.trained_models[model_type] = model
            
            # Load metadata if available
            metadata_path = Path(model_path).parent / f"{model_type}_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    self.model_metadata[model_type] = json.load(f)
            
            self.logger.info(f"Model loaded successfully: {model_type}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load model {model_type}: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Obter informações sobre modelos treinados
        
        Returns:
            Informações dos modelos
        """
        return {
            "trained_models": list(self.trained_models.keys()),
            "model_metadata": self.model_metadata,
            "available_algorithms": {
                model_type: list(config["models"].keys())
                for model_type, config in self.model_configs.items()
            }
        }
    
    def train_all_models(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Treinar todos os tipos de modelos
        
        Args:
            data: Dados de treinamento
            
        Returns:
            Resultados de todos os treinamentos
        """
        results = {}
        
        for model_type in self.model_configs.keys():
            try:
                self.logger.info(f"Training {model_type} model")
                result = self.train_model(model_type, data)
                results[model_type] = result
            except Exception as e:
                self.logger.error(f"Failed to train {model_type} model: {e}")
                results[model_type] = {
                    "training_completed": False,
                    "error": str(e)
                }
        
        return results