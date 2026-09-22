import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, GraphConv, global_mean_pool
from torch_geometric.data import Data
import numpy as np
from pathlib import Path

class FraudDetectionGNN(nn.Module):
    """Graph Neural Network for credit card fraud detection using Graph Convolutional Networks."""

    def __init__(self, input_dim, hidden_dim=64, output_dim=1, num_layers=3, dropout=0.3):
        super(FraudDetectionGNN, self).__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers

        # Graph convolutional layers
        self.conv_layers = nn.ModuleList()
        self.batch_norms = nn.ModuleList()

        # First layer
        self.conv_layers.append(GCNConv(input_dim, hidden_dim))
        self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Hidden layers
        for _ in range(num_layers - 2):
            self.conv_layers.append(GCNConv(hidden_dim, hidden_dim))
            self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Output layer
        self.conv_layers.append(GCNConv(hidden_dim, hidden_dim))
        self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Dense layers for classification
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.fc2 = nn.Linear(32, output_dim)

        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x, edge_index, batch=None):
        """Forward pass through the GNN."""
        # Graph convolution with residual connections
        for i, (conv, bn) in enumerate(zip(self.conv_layers[:-1], self.batch_norms[:-1])):
            x = conv(x, edge_index)
            x = bn(x)
            x = self.relu(x)
            x = self.dropout(x)

        # Final graph convolution
        x = self.conv_layers[-1](x, edge_index)
        x = self.batch_norms[-1](x)
        x = self.relu(x)

        # Global pooling if batch is provided
        if batch is not None:
            x = global_mean_pool(x, batch)

        # Dense layers
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        x = self.sigmoid(x)

        return x

    def save(self, filepath):
        """Save model to file."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.state_dict(), filepath)
        print(f"Model saved to {filepath}")

    @classmethod
    def load(cls, filepath, input_dim, **kwargs):
        """Load model from file."""
        model = cls(input_dim, **kwargs)
        model.load_state_dict(torch.load(filepath))
        model.eval()
        print(f"Model loaded from {filepath}")
        return model


class GNNTrainer:
    """Trainer for the fraud detection GNN model."""

    def __init__(self, model, device='cpu', lr=0.001):
        self.model = model.to(device)
        self.device = device
        self.optimizer = torch.optim.Adam(model.parameters(), lr=lr)
        self.criterion = nn.BCELoss()
        self.best_val_loss = float('inf')
        self.patience_counter = 0

    def train_epoch(self, train_loader):
        """Train for one epoch."""
        self.model.train()
        total_loss = 0
        total_correct = 0
        total_samples = 0

        for batch in train_loader:
            batch = batch.to(self.device)
            self.optimizer.zero_grad()

            # Forward pass
            out = self.model(batch.x, batch.edge_index, batch.batch)
            loss = self.criterion(out.squeeze(), batch.y.float())

            # Backward pass
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += loss.item() * batch.num_graphs
            preds = (out.squeeze() > 0.5).long()
            total_correct += (preds == batch.y).sum().item()
            total_samples += batch.num_graphs

        avg_loss = total_loss / total_samples
        accuracy = total_correct / total_samples

        return avg_loss, accuracy

    def evaluate(self, val_loader):
        """Evaluate on validation set."""
        self.model.eval()
        total_loss = 0
        total_correct = 0
        total_samples = 0
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for batch in val_loader:
                batch = batch.to(self.device)
                out = self.model(batch.x, batch.edge_index, batch.batch)
                loss = self.criterion(out.squeeze(), batch.y.float())

                total_loss += loss.item() * batch.num_graphs
                preds = (out.squeeze() > 0.5).long()
                total_correct += (preds == batch.y).sum().item()
                total_samples += batch.num_graphs

                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(batch.y.cpu().numpy())

        avg_loss = total_loss / total_samples
        accuracy = total_correct / total_samples

        return avg_loss, accuracy, all_preds, all_labels

    def fit(self, train_loader, val_loader, epochs=50, early_stopping_patience=10):
        """Train the model."""
        train_losses = []
        val_losses = []
        train_accs = []
        val_accs = []

        for epoch in range(epochs):
            train_loss, train_acc = self.train_epoch(train_loader)
            val_loss, val_acc, _, _ = self.evaluate(val_loader)

            train_losses.append(train_loss)
            val_losses.append(val_loss)
            train_accs.append(train_acc)
            val_accs.append(val_acc)

            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1}/{epochs}")
                print(f"  Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
                print(f"  Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

            # Early stopping
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.patience_counter = 0
            else:
                self.patience_counter += 1
                if self.patience_counter >= early_stopping_patience:
                    print(f"Early stopping at epoch {epoch+1}")
                    break

        return {
            'train_losses': train_losses,
            'val_losses': val_losses,
            'train_accs': train_accs,
            'val_accs': val_accs,
        }

    def predict(self, data):
        """Make predictions on new data."""
        self.model.eval()
        with torch.no_grad():
            data = data.to(self.device)
            out = self.model(data.x, data.edge_index, data.batch if hasattr(data, 'batch') else None)
            return out.cpu().numpy()
