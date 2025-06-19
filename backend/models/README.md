# ML Models Directory

This directory stores trained machine learning models for the Smart Matching Engine.

## Model Files

- `success_predictor.pkl` - RandomForest model for predicting manufacturer success rates
- `cost_predictor.pkl` - RandomForest model for estimating project costs
- `delivery_predictor.pkl` - RandomForest model for predicting delivery times

## Model Training

Models are automatically trained from historical data when they don't exist. 
The training process uses:
- Order/Quote/Manufacturer historical data
- 15 engineered features per manufacturer-order combination
- RandomForest algorithms with optimized hyperparameters

## Configuration

Set `ML_MODELS_PATH` in your environment configuration to customize the storage location:

```python
# In backend/app/core/config.py
ML_MODELS_PATH = "custom/path/to/models"
```

## Model Lifecycle

1. **First Run**: Models are trained from historical data and saved
2. **Subsequent Runs**: Pre-trained models are loaded from disk
3. **Retraining**: Periodically retrain with new data for improved accuracy

## Monitoring

Monitor model performance and fallback usage through application logs:
- `ML predicted success rate: X.XXX for manufacturer Y`
- `ML predicted cost: $X.XX for manufacturer Y`
- `ML predicted delivery: X days for manufacturer Y` 