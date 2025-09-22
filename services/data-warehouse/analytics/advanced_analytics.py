"""
Advanced Analytics
Sistema de análises avançadas para o data warehouse
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
import logging
import pandas as pd
import numpy as np
from dataclasses import dataclass
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

logger = logging.getLogger(__name__)

@dataclass
class AnalysisResult:
    """Resultado de análise"""
    analysis_id: str
    analysis_type: str
    title: str
    description: str
    results: Dict[str, Any]
    insights: List[str]
    confidence_score: float
    created_at: datetime

@dataclass
class PredictionModel:
    """Modelo de predição"""
    model_id: str
    model_type: str
    target_variable: str
    features: List[str]
    performance_metrics: Dict[str, float]
    model_object: Any
    created_at: datetime

class AdvancedAnalytics:
    """Sistema de análises avançadas para dados de saúde"""
    
    def __init__(self, dimensional_model):
        self.dimensional_model = dimensional_model
        self.is_active = False
        self.analysis_cache = {}
        self.prediction_models = {}
        self.statistical_tests = {}
        
    async def initialize(self):
        """Inicializa o sistema de análises avançadas"""
        try:
            logger.info("Initializing Advanced Analytics...")
            
            # Setup statistical tests
            await self._setup_statistical_tests()
            
            # Initialize analysis methods
            await self._setup_analysis_methods()
            
            self.is_active = True
            logger.info("Advanced Analytics initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Advanced Analytics: {e}")
            raise
    
    async def correlation_analysis(
        self, 
        variables: List[str],
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Análise de correlação entre variáveis"""
        try:
            logger.info(f"Performing correlation analysis for variables: {variables}")
            
            # Get data for variables
            data = await self._get_analysis_data(variables, date_range, filters)
            
            if data.empty:
                raise ValueError("No data available for correlation analysis")
            
            # Calculate correlation matrix
            correlation_matrix = data[variables].corr()
            
            # Find significant correlations
            significant_correlations = []
            for i in range(len(variables)):
                for j in range(i + 1, len(variables)):
                    var1, var2 = variables[i], variables[j]
                    correlation = correlation_matrix.iloc[i, j]
                    
                    if abs(correlation) > 0.5:  # Significant correlation threshold
                        significant_correlations.append({
                            "variable_1": var1,
                            "variable_2": var2,
                            "correlation": float(correlation),
                            "strength": self._interpret_correlation_strength(correlation)
                        })
            
            # Generate insights
            insights = await self._generate_correlation_insights(significant_correlations)
            
            # Calculate confidence score
            confidence_score = min(len(data) / 100, 1.0)  # Based on sample size
            
            analysis_result = AnalysisResult(
                analysis_id=str(uuid.uuid4()),
                analysis_type="correlation",
                title="Correlation Analysis",
                description=f"Correlation analysis of {len(variables)} variables",
                results={
                    "correlation_matrix": correlation_matrix.to_dict(),
                    "significant_correlations": significant_correlations,
                    "sample_size": len(data),
                    "variables": variables
                },
                insights=insights,
                confidence_score=confidence_score,
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Correlation analysis completed: {len(significant_correlations)} significant correlations found")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in correlation analysis: {e}")
            raise
    
    async def regression_analysis(
        self,
        target_variable: str,
        predictor_variables: List[str],
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Análise de regressão"""
        try:
            logger.info(f"Performing regression analysis: {target_variable} ~ {predictor_variables}")
            
            # Get data
            all_variables = [target_variable] + predictor_variables
            data = await self._get_analysis_data(all_variables, date_range, filters)
            
            if data.empty or len(data) < 20:
                raise ValueError("Insufficient data for regression analysis")
            
            # Prepare data
            X = data[predictor_variables].dropna()
            y = data[target_variable].dropna()
            
            # Ensure matching indices
            common_indices = X.index.intersection(y.index)
            X = X.loc[common_indices]
            y = y.loc[common_indices]
            
            if len(X) < 10:
                raise ValueError("Insufficient clean data for regression")
            
            # Fit regression model
            model = LinearRegression()
            model.fit(X, y)
            
            # Predictions
            y_pred = model.predict(X)
            
            # Calculate metrics
            r2 = r2_score(y, y_pred)
            mse = mean_squared_error(y, y_pred)
            rmse = np.sqrt(mse)
            
            # Feature importance (coefficients)
            feature_importance = []
            for i, var in enumerate(predictor_variables):
                feature_importance.append({
                    "variable": var,
                    "coefficient": float(model.coef_[i]),
                    "abs_coefficient": float(abs(model.coef_[i])),
                    "normalized_importance": float(abs(model.coef_[i]) / np.sum(np.abs(model.coef_)))
                })
            
            # Sort by importance
            feature_importance.sort(key=lambda x: x["abs_coefficient"], reverse=True)
            
            # Generate insights
            insights = await self._generate_regression_insights(
                target_variable, feature_importance, r2, rmse
            )
            
            # Confidence score based on R²
            confidence_score = min(r2, 0.95)
            
            analysis_result = AnalysisResult(
                analysis_id=str(uuid.uuid4()),
                analysis_type="regression",
                title=f"Regression Analysis: {target_variable}",
                description=f"Linear regression predicting {target_variable} using {len(predictor_variables)} variables",
                results={
                    "target_variable": target_variable,
                    "predictor_variables": predictor_variables,
                    "r_squared": float(r2),
                    "rmse": float(rmse),
                    "mse": float(mse),
                    "intercept": float(model.intercept_),
                    "feature_importance": feature_importance,
                    "sample_size": len(X),
                    "predictions_sample": y_pred[:10].tolist()  # First 10 predictions
                },
                insights=insights,
                confidence_score=confidence_score,
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Regression analysis completed: R² = {r2:.3f}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in regression analysis: {e}")
            raise
    
    async def time_series_forecasting(
        self,
        variable: str,
        forecast_periods: int = 12,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Previsão de séries temporais"""
        try:
            logger.info(f"Performing time series forecasting for {variable}")
            
            # Get historical data
            data = await self._get_time_series_data(variable, date_range, filters)
            
            if len(data) < 12:
                raise ValueError("Insufficient historical data for forecasting")
            
            # Simple moving average forecast (in production, would use ARIMA, Prophet, etc.)
            values = data[variable].values
            
            # Calculate trend
            trend = np.polyfit(range(len(values)), values, 1)[0]
            
            # Calculate seasonal component (simple approach)
            if len(values) >= 12:
                seasonal_period = 12
                seasonal_component = []
                for i in range(seasonal_period):
                    seasonal_values = values[i::seasonal_period]
                    seasonal_component.append(np.mean(seasonal_values) - np.mean(values))
            else:
                seasonal_component = [0] * 12
            
            # Generate forecasts
            last_value = values[-1]
            forecasts = []
            
            for i in range(forecast_periods):
                # Simple trend + seasonal forecast
                trend_component = trend * (len(values) + i + 1)
                seasonal_idx = i % len(seasonal_component)
                seasonal_comp = seasonal_component[seasonal_idx]
                
                forecast_value = last_value + trend_component + seasonal_comp
                
                # Add some confidence intervals
                std_error = np.std(values) * (1 + i * 0.1)  # Increasing uncertainty
                
                forecasts.append({
                    "period": i + 1,
                    "forecast": float(forecast_value),
                    "lower_bound": float(forecast_value - 1.96 * std_error),
                    "upper_bound": float(forecast_value + 1.96 * std_error),
                    "confidence": max(0.5, 0.95 - i * 0.05)  # Decreasing confidence
                })
            
            # Calculate forecast accuracy metrics (using last few points as validation)
            if len(values) > 20:
                validation_size = min(5, len(values) // 4)
                train_data = values[:-validation_size]
                validation_data = values[-validation_size:]
                
                # Simple validation forecast
                validation_forecasts = []
                for i in range(validation_size):
                    val_forecast = train_data[-1] + trend * (i + 1)
                    validation_forecasts.append(val_forecast)
                
                mape = np.mean(np.abs((validation_data - validation_forecasts) / validation_data)) * 100
                accuracy = max(0, 100 - mape)
            else:
                accuracy = 70.0  # Default accuracy
            
            # Generate insights
            insights = await self._generate_forecast_insights(variable, trend, forecasts, accuracy)
            
            analysis_result = AnalysisResult(
                analysis_id=str(uuid.uuid4()),
                analysis_type="time_series_forecast",
                title=f"Time Series Forecast: {variable}",
                description=f"Forecast of {variable} for next {forecast_periods} periods",
                results={
                    "variable": variable,
                    "historical_data": data[variable].tail(12).to_dict(),
                    "forecasts": forecasts,
                    "trend": float(trend),
                    "forecast_periods": forecast_periods,
                    "accuracy_estimate": float(accuracy),
                    "sample_size": len(data)
                },
                insights=insights,
                confidence_score=accuracy / 100,
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Time series forecasting completed: {forecast_periods} periods forecasted")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in time series forecasting: {e}")
            raise
    
    async def clustering_analysis(
        self,
        variables: List[str],
        n_clusters: Optional[int] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Análise de clustering/segmentação"""
        try:
            logger.info(f"Performing clustering analysis with variables: {variables}")
            
            # Get data
            data = await self._get_analysis_data(variables, date_range, filters)
            
            if data.empty or len(data) < 10:
                raise ValueError("Insufficient data for clustering analysis")
            
            # Prepare data
            X = data[variables].dropna()
            
            if len(X) < 5:
                raise ValueError("Insufficient clean data for clustering")
            
            # Standardize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Determine optimal number of clusters if not provided
            if n_clusters is None:
                n_clusters = await self._find_optimal_clusters(X_scaled)
            
            # Perform clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            cluster_labels = kmeans.fit_predict(X_scaled)
            
            # Add cluster labels to original data
            X_with_clusters = X.copy()
            X_with_clusters['cluster'] = cluster_labels
            
            # Analyze clusters
            cluster_analysis = []
            for i in range(n_clusters):
                cluster_data = X_with_clusters[X_with_clusters['cluster'] == i]
                
                cluster_profile = {}
                for var in variables:
                    cluster_profile[var] = {
                        "mean": float(cluster_data[var].mean()),
                        "std": float(cluster_data[var].std()),
                        "min": float(cluster_data[var].min()),
                        "max": float(cluster_data[var].max())
                    }
                
                cluster_analysis.append({
                    "cluster_id": i,
                    "size": len(cluster_data),
                    "percentage": float(len(cluster_data) / len(X) * 100),
                    "profile": cluster_profile,
                    "centroid": kmeans.cluster_centers_[i].tolist()
                })
            
            # Generate insights
            insights = await self._generate_clustering_insights(cluster_analysis, variables)
            
            # Calculate silhouette score for confidence
            try:
                from sklearn.metrics import silhouette_score
                silhouette_avg = silhouette_score(X_scaled, cluster_labels)
                confidence_score = (silhouette_avg + 1) / 2  # Convert from [-1,1] to [0,1]
            except:
                confidence_score = 0.7  # Default confidence
            
            analysis_result = AnalysisResult(
                analysis_id=str(uuid.uuid4()),
                analysis_type="clustering",
                title="Clustering Analysis",
                description=f"K-means clustering analysis with {n_clusters} clusters",
                results={
                    "variables": variables,
                    "n_clusters": n_clusters,
                    "cluster_analysis": cluster_analysis,
                    "sample_size": len(X),
                    "algorithm": "K-means"
                },
                insights=insights,
                confidence_score=confidence_score,
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Clustering analysis completed: {n_clusters} clusters identified")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in clustering analysis: {e}")
            raise
    
    async def statistical_testing(
        self,
        test_type: str,
        variables: List[str],
        groups: Optional[List[str]] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> AnalysisResult:
        """Testes estatísticos"""
        try:
            logger.info(f"Performing statistical test: {test_type}")
            
            # Get data
            if groups:
                all_variables = variables + groups
            else:
                all_variables = variables
                
            data = await self._get_analysis_data(all_variables, date_range, filters)
            
            if data.empty:
                raise ValueError("No data available for statistical testing")
            
            # Perform test based on type
            if test_type == "t_test" and len(variables) >= 2:
                result = await self._perform_t_test(data, variables[0], variables[1])
            elif test_type == "anova" and groups:
                result = await self._perform_anova(data, variables[0], groups[0])
            elif test_type == "chi_square" and len(variables) >= 2:
                result = await self._perform_chi_square(data, variables[0], variables[1])
            elif test_type == "normality_test":
                result = await self._perform_normality_test(data, variables[0])
            else:
                raise ValueError(f"Unsupported test type or insufficient variables: {test_type}")
            
            # Generate insights
            insights = await self._generate_statistical_insights(test_type, result)
            
            analysis_result = AnalysisResult(
                analysis_id=str(uuid.uuid4()),
                analysis_type="statistical_test",
                title=f"Statistical Test: {test_type.replace('_', ' ').title()}",
                description=f"{test_type} statistical test",
                results=result,
                insights=insights,
                confidence_score=1.0 - result.get("p_value", 0.5),  # Lower p-value = higher confidence
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Statistical test completed: {test_type}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in statistical testing: {e}")
            raise
    
    async def _get_analysis_data(
        self, 
        variables: List[str],
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Obtém dados para análise"""
        try:
            # Simulate data retrieval - in production, this would query the data warehouse
            np.random.seed(42)
            
            # Default date range
            if not date_range:
                end_date = datetime.now(timezone.utc)
                start_date = end_date - timedelta(days=365)
                date_range = (start_date, end_date)
            
            # Generate sample data
            n_samples = 500
            data = {}
            
            # Generate correlated variables
            base_trend = np.linspace(0, 100, n_samples) + np.random.normal(0, 10, n_samples)
            
            for i, var in enumerate(variables):
                if "patient_satisfaction" in var.lower():
                    data[var] = np.clip(base_trend * 0.04 + np.random.normal(4.2, 0.3, n_samples), 1, 5)
                elif "readmission" in var.lower():
                    data[var] = np.clip(20 - base_trend * 0.1 + np.random.normal(0, 2, n_samples), 0, 50)
                elif "revenue" in var.lower():
                    data[var] = base_trend * 25 + np.random.normal(2500, 200, n_samples)
                elif "cost" in var.lower():
                    data[var] = base_trend * 8 + np.random.normal(800, 100, n_samples)
                elif "length_stay" in var.lower():
                    data[var] = np.clip(5 - base_trend * 0.02 + np.random.normal(0, 0.5, n_samples), 1, 20)
                else:
                    data[var] = base_trend + np.random.normal(0, 15, n_samples)
            
            df = pd.DataFrame(data)
            
            # Add date index
            dates = pd.date_range(start=date_range[0], end=date_range[1], periods=n_samples)
            df.index = dates
            
            return df
            
        except Exception as e:
            logger.error(f"Error getting analysis data: {e}")
            return pd.DataFrame()
    
    async def _get_time_series_data(
        self, 
        variable: str,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """Obtém dados de série temporal"""
        try:
            # Simulate monthly time series data
            if not date_range:
                end_date = datetime.now(timezone.utc)
                start_date = end_date - timedelta(days=730)  # 2 years
            else:
                start_date, end_date = date_range
            
            # Generate monthly data points
            months = pd.date_range(start=start_date, end=end_date, freq='M')
            n_points = len(months)
            
            # Generate time series with trend and seasonality
            trend = np.linspace(100, 120, n_points)
            seasonal = 10 * np.sin(2 * np.pi * np.arange(n_points) / 12)
            noise = np.random.normal(0, 5, n_points)
            
            if "patient_satisfaction" in variable.lower():
                values = np.clip(3.8 + trend * 0.008 + seasonal * 0.05 + noise * 0.05, 1, 5)
            elif "revenue" in variable.lower():
                values = trend * 20 + seasonal * 100 + noise * 50 + 2000
            else:
                values = trend + seasonal + noise
            
            df = pd.DataFrame({
                variable: values,
                'date': months
            })
            df.set_index('date', inplace=True)
            
            return df
            
        except Exception as e:
            logger.error(f"Error getting time series data: {e}")
            return pd.DataFrame()
    
    async def _setup_statistical_tests(self):
        """Configura testes estatísticos disponíveis"""
        
        self.statistical_tests = {
            "t_test": {
                "name": "T-Test",
                "description": "Compare means between two groups",
                "min_variables": 2,
                "requirements": ["numeric"]
            },
            "anova": {
                "name": "ANOVA",
                "description": "Compare means across multiple groups",
                "min_variables": 1,
                "requirements": ["numeric", "categorical"]
            },
            "chi_square": {
                "name": "Chi-Square Test",
                "description": "Test independence between categorical variables",
                "min_variables": 2,
                "requirements": ["categorical"]
            },
            "normality_test": {
                "name": "Normality Test",
                "description": "Test if data follows normal distribution",
                "min_variables": 1,
                "requirements": ["numeric"]
            }
        }
    
    async def _setup_analysis_methods(self):
        """Configura métodos de análise"""
        # Setup would configure analysis parameters and methods
        pass
    
    def _interpret_correlation_strength(self, correlation: float) -> str:
        """Interpreta força da correlação"""
        abs_corr = abs(correlation)
        if abs_corr >= 0.8:
            return "very strong"
        elif abs_corr >= 0.6:
            return "strong"
        elif abs_corr >= 0.4:
            return "moderate"
        elif abs_corr >= 0.2:
            return "weak"
        else:
            return "very weak"
    
    async def _generate_correlation_insights(self, correlations: List[Dict[str, Any]]) -> List[str]:
        """Gera insights de análise de correlação"""
        insights = []
        
        if not correlations:
            insights.append("No significant correlations found between the analyzed variables.")
        else:
            # Strongest positive correlation
            pos_corr = [c for c in correlations if c["correlation"] > 0]
            if pos_corr:
                strongest_pos = max(pos_corr, key=lambda x: x["correlation"])
                insights.append(
                    f"Strongest positive correlation: {strongest_pos['variable_1']} and {strongest_pos['variable_2']} "
                    f"(r = {strongest_pos['correlation']:.3f}, {strongest_pos['strength']} correlation)"
                )
            
            # Strongest negative correlation
            neg_corr = [c for c in correlations if c["correlation"] < 0]
            if neg_corr:
                strongest_neg = min(neg_corr, key=lambda x: x["correlation"])
                insights.append(
                    f"Strongest negative correlation: {strongest_neg['variable_1']} and {strongest_neg['variable_2']} "
                    f"(r = {strongest_neg['correlation']:.3f}, {abs(strongest_neg['correlation']):.3f} strength)"
                )
            
            insights.append(f"Total significant correlations found: {len(correlations)}")
        
        return insights
    
    async def _generate_regression_insights(
        self, 
        target: str, 
        features: List[Dict[str, Any]], 
        r2: float, 
        rmse: float
    ) -> List[str]:
        """Gera insights de análise de regressão"""
        insights = []
        
        # Model performance
        if r2 > 0.8:
            insights.append(f"Excellent model fit: R² = {r2:.3f} (explains {r2*100:.1f}% of variance)")
        elif r2 > 0.6:
            insights.append(f"Good model fit: R² = {r2:.3f} (explains {r2*100:.1f}% of variance)")
        elif r2 > 0.4:
            insights.append(f"Moderate model fit: R² = {r2:.3f} (explains {r2*100:.1f}% of variance)")
        else:
            insights.append(f"Weak model fit: R² = {r2:.3f} (explains {r2*100:.1f}% of variance)")
        
        # Most important features
        if features:
            top_feature = features[0]
            insights.append(
                f"Most influential predictor: {top_feature['variable']} "
                f"(coefficient: {top_feature['coefficient']:.3f})"
            )
            
            if len(features) > 1:
                insights.append(
                    f"Top predictors account for {sum(f['normalized_importance'] for f in features[:3]):.1%} "
                    f"of total model influence"
                )
        
        insights.append(f"Model prediction error (RMSE): {rmse:.2f}")
        
        return insights
    
    async def _generate_forecast_insights(
        self, 
        variable: str, 
        trend: float, 
        forecasts: List[Dict[str, Any]], 
        accuracy: float
    ) -> List[str]:
        """Gera insights de previsão"""
        insights = []
        
        # Trend analysis
        if abs(trend) < 0.1:
            insights.append(f"{variable} shows stable trend with minimal change expected")
        elif trend > 0:
            insights.append(f"{variable} shows positive trend, expected to increase by {trend:.2f} units per period")
        else:
            insights.append(f"{variable} shows negative trend, expected to decrease by {abs(trend):.2f} units per period")
        
        # Forecast confidence
        if accuracy > 85:
            insights.append(f"High forecast confidence: {accuracy:.1f}% accuracy estimate")
        elif accuracy > 70:
            insights.append(f"Moderate forecast confidence: {accuracy:.1f}% accuracy estimate")
        else:
            insights.append(f"Low forecast confidence: {accuracy:.1f}% accuracy estimate - use with caution")
        
        # Next period prediction
        if forecasts:
            next_forecast = forecasts[0]
            insights.append(
                f"Next period prediction: {next_forecast['forecast']:.2f} "
                f"(confidence interval: {next_forecast['lower_bound']:.2f} - {next_forecast['upper_bound']:.2f})"
            )
        
        return insights
    
    async def _generate_clustering_insights(
        self, 
        clusters: List[Dict[str, Any]], 
        variables: List[str]
    ) -> List[str]:
        """Gera insights de clustering"""
        insights = []
        
        # Cluster sizes
        sizes = [c["size"] for c in clusters]
        largest_cluster = max(clusters, key=lambda x: x["size"])
        smallest_cluster = min(clusters, key=lambda x: x["size"])
        
        insights.append(
            f"Largest cluster: {largest_cluster['size']} records ({largest_cluster['percentage']:.1f}%)"
        )
        insights.append(
            f"Smallest cluster: {smallest_cluster['size']} records ({smallest_cluster['percentage']:.1f}%)"
        )
        
        # Cluster characteristics
        for i, cluster in enumerate(clusters):
            profile = cluster["profile"]
            high_vars = []
            low_vars = []
            
            # Find distinguishing characteristics
            for var in variables:
                var_mean = profile[var]["mean"]
                # Compare with overall mean (simplified)
                if var_mean > 0:  # Simplified comparison
                    high_vars.append(var)
                else:
                    low_vars.append(var)
            
            if high_vars:
                insights.append(f"Cluster {i}: Characterized by higher {', '.join(high_vars[:2])}")
        
        return insights
    
    async def _generate_statistical_insights(
        self, 
        test_type: str, 
        result: Dict[str, Any]
    ) -> List[str]:
        """Gera insights de testes estatísticos"""
        insights = []
        
        p_value = result.get("p_value", 1.0)
        alpha = 0.05
        
        if p_value < alpha:
            insights.append(f"Statistically significant result (p = {p_value:.4f} < {alpha})")
            insights.append("The observed difference is unlikely due to chance")
        else:
            insights.append(f"No statistical significance found (p = {p_value:.4f} ≥ {alpha})")
            insights.append("The observed difference could be due to random variation")
        
        # Test-specific insights
        if test_type == "t_test":
            effect_size = result.get("effect_size", 0)
            if abs(effect_size) > 0.8:
                insights.append("Large effect size detected - practically significant difference")
            elif abs(effect_size) > 0.5:
                insights.append("Medium effect size detected - moderate practical significance")
            elif abs(effect_size) > 0.2:
                insights.append("Small effect size detected - limited practical significance")
        
        return insights
    
    async def _find_optimal_clusters(self, X: np.ndarray) -> int:
        """Encontra número ótimo de clusters usando método elbow"""
        try:
            max_clusters = min(10, len(X) // 2)
            inertias = []
            
            for k in range(2, max_clusters + 1):
                kmeans = KMeans(n_clusters=k, random_state=42)
                kmeans.fit(X)
                inertias.append(kmeans.inertia_)
            
            # Simple elbow detection (find biggest drop)
            if len(inertias) > 1:
                diffs = np.diff(inertias)
                optimal_k = np.argmax(-diffs) + 2  # +2 because we started from k=2
                return min(optimal_k, 5)  # Cap at 5 clusters
            else:
                return 3  # Default
                
        except Exception:
            return 3  # Default fallback
    
    async def _perform_t_test(self, data: pd.DataFrame, var1: str, var2: str) -> Dict[str, Any]:
        """Realiza teste t"""
        try:
            sample1 = data[var1].dropna()
            sample2 = data[var2].dropna()
            
            statistic, p_value = stats.ttest_ind(sample1, sample2)
            
            # Calculate effect size (Cohen's d)
            pooled_std = np.sqrt(((len(sample1) - 1) * sample1.var() + (len(sample2) - 1) * sample2.var()) / 
                               (len(sample1) + len(sample2) - 2))
            effect_size = (sample1.mean() - sample2.mean()) / pooled_std
            
            return {
                "test_type": "t_test",
                "variable_1": var1,
                "variable_2": var2,
                "statistic": float(statistic),
                "p_value": float(p_value),
                "effect_size": float(effect_size),
                "sample_size_1": len(sample1),
                "sample_size_2": len(sample2),
                "mean_1": float(sample1.mean()),
                "mean_2": float(sample2.mean())
            }
            
        except Exception as e:
            logger.error(f"Error in t-test: {e}")
            return {"error": str(e)}
    
    async def _perform_anova(self, data: pd.DataFrame, variable: str, group: str) -> Dict[str, Any]:
        """Realiza ANOVA"""
        try:
            # Simulate ANOVA - in production would use proper grouping
            groups = []
            group_names = ["Group_A", "Group_B", "Group_C"]
            
            # Split data into groups (simplified)
            n_per_group = len(data) // 3
            for i, name in enumerate(group_names):
                start_idx = i * n_per_group
                end_idx = start_idx + n_per_group if i < 2 else len(data)
                group_data = data[variable].iloc[start_idx:end_idx].dropna()
                groups.append(group_data)
            
            statistic, p_value = stats.f_oneway(*groups)
            
            return {
                "test_type": "anova",
                "variable": variable,
                "grouping_variable": group,
                "statistic": float(statistic),
                "p_value": float(p_value),
                "groups": group_names,
                "group_sizes": [len(g) for g in groups],
                "group_means": [float(g.mean()) for g in groups]
            }
            
        except Exception as e:
            logger.error(f"Error in ANOVA: {e}")
            return {"error": str(e)}
    
    async def _perform_chi_square(self, data: pd.DataFrame, var1: str, var2: str) -> Dict[str, Any]:
        """Realiza teste qui-quadrado"""
        try:
            # Simulate categorical data by binning
            data1_cat = pd.cut(data[var1], bins=3, labels=['Low', 'Medium', 'High'])
            data2_cat = pd.cut(data[var2], bins=3, labels=['Low', 'Medium', 'High'])
            
            # Create contingency table
            contingency_table = pd.crosstab(data1_cat, data2_cat)
            
            statistic, p_value, dof, expected = stats.chi2_contingency(contingency_table)
            
            return {
                "test_type": "chi_square",
                "variable_1": var1,
                "variable_2": var2,
                "statistic": float(statistic),
                "p_value": float(p_value),
                "degrees_of_freedom": int(dof),
                "contingency_table": contingency_table.to_dict(),
                "sample_size": len(data)
            }
            
        except Exception as e:
            logger.error(f"Error in chi-square test: {e}")
            return {"error": str(e)}
    
    async def _perform_normality_test(self, data: pd.DataFrame, variable: str) -> Dict[str, Any]:
        """Realiza teste de normalidade"""
        try:
            sample = data[variable].dropna()
            
            # Shapiro-Wilk test
            statistic, p_value = stats.shapiro(sample[:5000])  # Limit sample size
            
            return {
                "test_type": "normality_test",
                "variable": variable,
                "test_method": "Shapiro-Wilk",
                "statistic": float(statistic),
                "p_value": float(p_value),
                "sample_size": len(sample),
                "mean": float(sample.mean()),
                "std": float(sample.std()),
                "skewness": float(stats.skew(sample)),
                "kurtosis": float(stats.kurtosis(sample))
            }
            
        except Exception as e:
            logger.error(f"Error in normality test: {e}")
            return {"error": str(e)}