#!/usr/bin/env python3
"""
Training script for the GNN fraud detection model.

Usage:
    python train_gnn.py --data <path-to-kaggle-dataset> --epochs 50 --batch-size 32
"""

import argparse
import os
import pickle
import numpy as np
import pandas as pd
import torch
from pathlib import Path
from torch_geometric.data import DataLoader, Data
from sklearn.preprocessing import StandardScaler

from preprocessor import TransactionPreprocessor, GraphBuilder
from gnn_model import FraudDetectionGNN, GNNTrainer


def create_torch_geometric_data(X, y, edges, num_nodes):
    """Convert preprocessed data to PyTorch Geometric format."""
    x = torch.FloatTensor(X)
    y_tensor = torch.LongTensor(y)
    edge_index = torch.LongTensor(edges)

    data = Data(
        x=x,
        edge_index=edge_index,
        y=y_tensor,
        num_nodes=num_nodes
    )
    return data


def main():
    parser = argparse.ArgumentParser(description="Train GNN fraud detection model")
    parser.add_argument("--data", type=str, help="Path to Kaggle credit card fraud dataset CSV")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--hidden-dim", type=int, default=64, help="Hidden dimension size")
    parser.add_argument("--output-dir", type=str, default="models", help="Output directory for models")
    args = parser.parse_args()

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)

    # Load and preprocess data
    print("Loading and preprocessing data...")
    if args.data:
        preprocessor = TransactionPreprocessor()
        df = preprocessor.load_kaggle_data(args.data)
        X, y, feature_cols = preprocessor.preprocess(df)
    else:
        print("Warning: No data provided. Creating synthetic data for testing.")
        # Create synthetic data for testing
        X = np.random.randn(1000, 29).astype(np.float32)
        y = np.random.binomial(1, 0.05, 1000)
        feature_cols = [f"feature_{i}" for i in range(29)]

    num_features = X.shape[1]
    print(f"Feature dimension: {num_features}")

    # Build graph structure
    print("Building transaction graph...")
    if args.data:
        graph_builder = GraphBuilder(df)
        graph_info = graph_builder.build_graph()
        edges = graph_info['edges']
        num_nodes = graph_info['num_nodes']

        # Save graph data
        with open(output_dir / "graph_data.pkl", 'wb') as f:
            pickle.dump(graph_info, f)
    else:
        # Synthetic graph
        edges = np.array([np.random.randint(0, 100, size=1000),
                         np.random.randint(0, 100, size=1000)])
        num_nodes = 100

    # Convert to PyTorch Geometric
    print("Converting to PyTorch Geometric format...")
    data = create_torch_geometric_data(X, y, edges, num_nodes)

    # Split data
    train_size = int(0.8 * len(data.y))
    val_size = int(0.1 * len(data.y))

    indices = torch.randperm(len(data.y))
    train_indices = indices[:train_size]
    val_indices = indices[train_size:train_size + val_size]

    train_data = data.clone()
    train_data.train_mask = torch.zeros(len(data.y), dtype=torch.bool)
    train_data.train_mask[train_indices] = True

    val_data = data.clone()
    val_data.val_mask = torch.zeros(len(data.y), dtype=torch.bool)
    val_data.val_mask[val_indices] = True

    # Create data loaders
    train_loader = DataLoader([train_data], batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader([val_data], batch_size=args.batch_size)

    # Create model
    print("Creating GNN model...")
    model = FraudDetectionGNN(
        input_dim=num_features,
        hidden_dim=args.hidden_dim,
        output_dim=1,
        num_layers=3,
        dropout=0.3
    )

    # Train model
    print("Starting training...")
    trainer = GNNTrainer(model, device=device, lr=args.lr)
    history = trainer.fit(train_loader, val_loader, epochs=args.epochs, early_stopping_patience=15)

    # Save model
    print("Saving model...")
    model.save(output_dir / "fraud_detector.pt")

    # Save scaler
    scaler = StandardScaler()
    scaler.fit(X)
    with open(output_dir / "scaler.pkl", 'wb') as f:
        pickle.dump(scaler, f)

    print(f"\nTraining completed!")
    print(f"Model saved to: {output_dir / 'fraud_detector.pt'}")
    print(f"Scaler saved to: {output_dir / 'scaler.pkl'}")

    # Print training summary
    print("\nTraining Summary:")
    print(f"  Final train loss: {history['train_losses'][-1]:.4f}")
    print(f"  Final val loss: {history['val_losses'][-1]:.4f}")
    print(f"  Final train accuracy: {history['train_accs'][-1]:.4f}")
    print(f"  Final val accuracy: {history['val_accs'][-1]:.4f}")


if __name__ == "__main__":
    main()
