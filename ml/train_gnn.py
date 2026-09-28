"""
Training script for the fraud detection GNN.

Usage:
    python -m ml.train_gnn --data /path/to/transactions.csv --output ml/models/fraud_detector.pt

This script:
- Loads transaction data
- Preprocesses features
- Builds the customer-merchant-card graph
- Trains FraudDetectionGNN
- Saves model, scaler, and graph_data

Note: The script is a stub that demonstrates the pipeline. Replace the
data loading with your actual Kaggle dataset or production data source.
"""
import argparse
from pathlib import Path
from ml.preprocessor import TransactionPreprocessor, GraphBuilder
from ml.gnn_model import FraudDetectionGNN, GNNTrainer
import torch


def main(args):
    preproc = TransactionPreprocessor()
    df = preproc.load_kaggle_data(args.data)
    X, y, features = preproc.preprocess(df)

    # Build graph from transactions
    # Map DataFrame columns to expected names
    tx_df = df.rename(columns={
        'Customer': 'customer_id',
        'Merchant': 'merchant_id',
        'Card': 'card_id',
        'Amount': 'amount',
    })
    graph_builder = GraphBuilder(tx_df)
    graph = graph_builder.build_graph()

    # Placeholder: train on dummy data
    print("Training pipeline stub. Implement actual data loader and training loop.")
    print(f"Features: {len(features)}, Fraud rate: {y.mean():.3f}")
    print(f"Graph nodes: {graph['num_nodes']}, edges: {len(graph['edges'])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to transaction CSV")
    parser.add_argument("--output", default="ml/models/fraud_detector.pt")
    args = parser.parse_args()
    main(args)
