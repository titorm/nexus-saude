"""
Tests for ML pipeline functionality
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import numpy as np

try:
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score
except ImportError:
    # Mock for development
    pd = Mock()
    RandomForestClassifier = Mock
    accuracy_score = Mock()

from app.core.pipeline import MLPipeline


class TestMLPipeline:
    """Test cases for ML pipeline"""
    
    def test_pipeline_initialization(self):
        """Test pipeline initialization"""
        pipeline = MLPipeline()
        
        assert pipeline is not None
        assert hasattr(pipeline, 'models')
        assert hasattr(pipeline, 'preprocessors')
    
    @patch('app.core.pipeline.joblib.load')
    def test_load_model(self, mock_joblib):
        """Test model loading"""
        mock_model = Mock()
        mock_joblib.return_value = mock_model
        
        pipeline = MLPipeline()
        pipeline.load_model('diagnostic', 'path/to/model')
        
        mock_joblib.assert_called_once()
        assert 'diagnostic' in pipeline.models
    
    def test_preprocess_patient_data(self):
        """Test patient data preprocessing"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 45,
            "gender": "male",
            "blood_pressure": 140,
            "cholesterol": 200,
            "glucose": 180
        }
        
        features = ["age", "blood_pressure", "glucose"]
        
        processed = pipeline._preprocess_patient_data(patient_data, features)
        
        assert isinstance(processed, (list, np.ndarray))
        assert len(processed) == len(features)
    
    def test_predict_diagnostic_mock(self):
        """Test diagnostic prediction with mock data"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 55,
            "blood_pressure": 150,
            "glucose": 200,
            "cholesterol": 250
        }
        
        features = ["age", "blood_pressure", "glucose", "cholesterol"]
        
        result = pipeline.predict_diagnostic(patient_data, features)
        
        assert isinstance(result, dict)
        assert "prediction" in result
        assert "confidence" in result
        assert "risk_factors" in result
        assert isinstance(result["confidence"], (int, float))
        assert 0 <= result["confidence"] <= 1
    
    def test_predict_risk_mock(self):
        """Test risk prediction with mock data"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 65,
            "medical_history": ["hypertension", "diabetes"],
            "lifestyle_factors": {
                "smoking": True,
                "exercise": "low"
            }
        }
        
        result = pipeline.predict_risk(patient_data, "cardiovascular")
        
        assert isinstance(result, dict)
        assert "risk_score" in result
        assert "risk_level" in result
        assert "contributing_factors" in result
        assert isinstance(result["risk_score"], (int, float))
        assert 0 <= result["risk_score"] <= 1
    
    @patch('app.core.pipeline.joblib.load')
    def test_predict_with_trained_model(self, mock_joblib):
        """Test prediction with a trained model"""
        # Mock trained model
        mock_model = Mock()
        mock_model.predict.return_value = [1]  # Positive prediction
        mock_model.predict_proba.return_value = [[0.2, 0.8]]  # 80% confidence
        mock_joblib.return_value = mock_model
        
        pipeline = MLPipeline()
        pipeline.load_model('diagnostic', 'path/to/model')
        
        patient_data = {
            "age": 45,
            "blood_pressure": 140,
            "glucose": 180
        }
        
        features = ["age", "blood_pressure", "glucose"]
        
        result = pipeline.predict_diagnostic(patient_data, features)
        
        # Verify model was called
        mock_model.predict.assert_called_once()
        mock_model.predict_proba.assert_called_once()
        
        assert isinstance(result, dict)
        assert "prediction" in result
        assert "confidence" in result
    
    def test_validate_patient_data(self):
        """Test patient data validation"""
        pipeline = MLPipeline()
        
        # Valid data
        valid_data = {
            "age": 45,
            "blood_pressure": 140,
            "glucose": 120
        }
        
        features = ["age", "blood_pressure", "glucose"]
        
        # Should not raise exception
        pipeline._validate_patient_data(valid_data, features)
        
        # Invalid data - missing feature
        invalid_data = {
            "age": 45,
            "blood_pressure": 140
            # missing glucose
        }
        
        with pytest.raises(ValueError):
            pipeline._validate_patient_data(invalid_data, features)
    
    def test_feature_engineering(self):
        """Test feature engineering methods"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 45,
            "weight": 80,
            "height": 175,
            "blood_pressure": 140
        }
        
        # Test BMI calculation
        bmi = pipeline._calculate_bmi(patient_data.get("weight"), patient_data.get("height"))
        assert isinstance(bmi, (int, float))
        assert 15 <= bmi <= 50  # Reasonable BMI range
        
        # Test age group categorization
        age_group = pipeline._categorize_age(patient_data["age"])
        assert age_group in ["young", "middle_aged", "elderly"]
        
        # Test blood pressure category
        bp_category = pipeline._categorize_blood_pressure(patient_data["blood_pressure"])
        assert bp_category in ["normal", "elevated", "high"]
    
    def test_risk_factor_identification(self):
        """Test risk factor identification"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 65,
            "blood_pressure": 160,
            "cholesterol": 280,
            "glucose": 200,
            "bmi": 32,
            "smoking": True
        }
        
        risk_factors = pipeline._identify_risk_factors(patient_data)
        
        assert isinstance(risk_factors, list)
        assert len(risk_factors) > 0
        
        # Should identify high values
        assert any("blood_pressure" in factor or "hypertension" in factor for factor in risk_factors)
        assert any("cholesterol" in factor for factor in risk_factors)
        assert any("glucose" in factor or "diabetes" in factor for factor in risk_factors)


class TestModelTraining:
    """Test cases for model training functionality"""
    
    @patch('pandas.read_csv')
    @patch('sklearn.ensemble.RandomForestClassifier')
    def test_train_diagnostic_model(self, mock_rf, mock_read_csv):
        """Test training a diagnostic model"""
        # Mock training data
        mock_data = Mock()
        mock_data.shape = (1000, 10)
        mock_data.columns = ['age', 'bp', 'glucose', 'target']
        mock_read_csv.return_value = mock_data
        
        # Mock model
        mock_model = Mock()
        mock_model.fit.return_value = None
        mock_model.score.return_value = 0.85
        mock_rf.return_value = mock_model
        
        pipeline = MLPipeline()
        
        # Test training
        result = pipeline.train_model(
            model_type='diagnostic',
            data_path='path/to/data.csv',
            target_column='diagnosis'
        )
        
        assert isinstance(result, dict)
        assert "accuracy" in result
        assert "model_path" in result
        
        # Verify model was trained
        mock_model.fit.assert_called_once()
    
    @patch('app.core.pipeline.joblib.dump')
    def test_save_model(self, mock_joblib_dump):
        """Test model saving"""
        pipeline = MLPipeline()
        
        mock_model = Mock()
        pipeline.models['test'] = mock_model
        
        pipeline.save_model('test', 'path/to/save')
        
        mock_joblib_dump.assert_called_once_with(mock_model, 'path/to/save')
    
    def test_model_evaluation(self):
        """Test model evaluation metrics"""
        pipeline = MLPipeline()
        
        # Mock predictions and actual values
        y_true = [0, 1, 1, 0, 1, 0, 1, 1, 0, 0]
        y_pred = [0, 1, 0, 0, 1, 0, 1, 1, 0, 1]
        
        metrics = pipeline._calculate_metrics(y_true, y_pred)
        
        assert isinstance(metrics, dict)
        assert "accuracy" in metrics
        assert "precision" in metrics
        assert "recall" in metrics
        assert "f1_score" in metrics
        
        # Check metric ranges
        for metric_name, value in metrics.items():
            assert 0 <= value <= 1, f"{metric_name} should be between 0 and 1"


class TestDataPreprocessing:
    """Test cases for data preprocessing"""
    
    def test_handle_missing_values(self):
        """Test missing value handling"""
        pipeline = MLPipeline()
        
        # Mock data with missing values
        data = {
            "age": [25, 30, None, 45],
            "blood_pressure": [120, None, 140, 150],
            "glucose": [100, 110, 95, None]
        }
        
        cleaned_data = pipeline._handle_missing_values(data)
        
        assert isinstance(cleaned_data, dict)
        
        # Check that missing values are handled
        for column, values in cleaned_data.items():
            assert None not in values
    
    def test_outlier_detection(self):
        """Test outlier detection and handling"""
        pipeline = MLPipeline()
        
        # Data with outliers
        values = [20, 25, 30, 35, 40, 45, 50, 1000]  # 1000 is an outlier
        
        outliers = pipeline._detect_outliers(values)
        
        assert isinstance(outliers, list)
        assert 1000 in outliers
    
    def test_feature_scaling(self):
        """Test feature scaling"""
        pipeline = MLPipeline()
        
        # Raw features
        features = [
            [25, 120, 100],
            [30, 140, 110],
            [45, 160, 120]
        ]
        
        scaled_features = pipeline._scale_features(features)
        
        assert isinstance(scaled_features, (list, np.ndarray))
        assert len(scaled_features) == len(features)
        
        # Check that scaling was applied (values should be different)
        assert not np.array_equal(features, scaled_features)


class TestPredictionValidation:
    """Test cases for prediction validation"""
    
    def test_confidence_threshold(self):
        """Test confidence threshold validation"""
        pipeline = MLPipeline()
        
        # High confidence prediction
        high_conf_result = {
            "prediction": "diabetes",
            "confidence": 0.95
        }
        
        validated = pipeline._validate_prediction_confidence(high_conf_result, threshold=0.8)
        assert validated["reliable"] is True
        
        # Low confidence prediction
        low_conf_result = {
            "prediction": "diabetes", 
            "confidence": 0.65
        }
        
        validated = pipeline._validate_prediction_confidence(low_conf_result, threshold=0.8)
        assert validated["reliable"] is False
    
    def test_prediction_consistency(self):
        """Test prediction consistency across multiple calls"""
        pipeline = MLPipeline()
        
        patient_data = {
            "age": 45,
            "blood_pressure": 140,
            "glucose": 180
        }
        
        features = ["age", "blood_pressure", "glucose"]
        
        # Make multiple predictions
        results = []
        for _ in range(5):
            result = pipeline.predict_diagnostic(patient_data, features)
            results.append(result)
        
        # Check consistency (for deterministic mock predictions)
        predictions = [r["prediction"] for r in results]
        assert len(set(predictions)) <= 2  # Should be mostly consistent


if __name__ == "__main__":
    # Run tests if executed directly
    import sys
    sys.exit(pytest.main([__file__]))