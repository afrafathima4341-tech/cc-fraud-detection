"""
Lightweight Graph Convolution and Graph Neural Network architecture for Fraud Detection.
Uses pure PyTorch (and optional torch_geometric when available) with residual GCN/GraphSAGE layers.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path
import math


class PurePyTorchGCNConv(nn.Module):
    """
    Standard Kipf & Welling Graph Convolutional Layer implemented with pure PyTorch.
    Computes \hat{D}^{-1/2} \hat{A} \hat{D}^{-1/2} X W.
    """
    def __init__(self, in_features, out_features, bias=True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = nn.Parameter(torch.FloatTensor(in_features, out_features))
        if bias:
            self.bias = nn.Parameter(torch.FloatTensor(out_features))
        else:
            self.register_parameter('bias', None)
        self.reset_parameters()

    def reset_parameters(self):
        stdv = 1.0 / math.sqrt(self.weight.size(1))
        self.weight.data.uniform_(-stdv, stdv)
        if self.bias is not None:
            self.bias.data.uniform_(-stdv, stdv)

    def forward(self, x, edge_index):
        # x: (N, in_features)
        num_nodes = x.size(0)
        
        if edge_index is None or edge_index.numel() == 0:
            # Self-loops only
            adj = torch.eye(num_nodes, device=x.device)
        else:
            # Add self-loops
            row, col = edge_index[0], edge_index[1]
            adj = torch.zeros((num_nodes, num_nodes), device=x.device)
            adj[row, col] = 1.0
            adj = adj + torch.eye(num_nodes, device=x.device)
            
            # Symmetric normalization D^{-1/2} A D^{-1/2}
            deg = torch.sum(adj, dim=1)
            deg_inv_sqrt = torch.pow(deg.clamp(min=1e-6), -0.5)
            deg_inv_sqrt[torch.isinf(deg_inv_sqrt)] = 0.0
            d_mat = torch.diag(deg_inv_sqrt)
            adj = torch.mm(torch.mm(d_mat, adj), d_mat)

        support = torch.mm(x, self.weight)
        output = torch.mm(adj, support)
        if self.bias is not None:
            output = output + self.bias
        return output


class FraudDetectionGNN(nn.Module):
    """Graph Neural Network for credit card & payment fraud detection."""

    def __init__(self, input_dim, hidden_dim=64, output_dim=1, num_layers=3, dropout=0.3):
        super(FraudDetectionGNN, self).__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers

        # Graph convolutional layers
        self.conv_layers = nn.ModuleList()
        self.batch_norms = nn.ModuleList()

        # Try to use PyG GCNConv if installed, else fallback to PurePyTorchGCNConv
        try:
            from torch_geometric.nn import GCNConv
            ConvClass = GCNConv
        except ImportError:
            ConvClass = PurePyTorchGCNConv

        # First layer
        self.conv_layers.append(ConvClass(input_dim, hidden_dim))
        self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Hidden layers
        for _ in range(num_layers - 2):
            self.conv_layers.append(ConvClass(hidden_dim, hidden_dim))
            self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Output graph layer
        self.conv_layers.append(ConvClass(hidden_dim, hidden_dim))
        self.batch_norms.append(nn.BatchNorm1d(hidden_dim))

        # Multi-layer perceptron head
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.fc2 = nn.Linear(32, output_dim)

        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()

    def forward(self, x, edge_index, batch=None):
        """Forward pass through the GNN."""
        for i, (conv, bn) in enumerate(zip(self.conv_layers[:-1], self.batch_norms[:-1])):
            x = conv(x, edge_index)
            if x.size(0) > 1:
                x = bn(x)
            x = self.relu(x)
            x = self.dropout(x)

        # Final graph convolution
        x = self.conv_layers[-1](x, edge_index)
        if x.size(0) > 1:
            x = self.batch_norms[-1](x)
        x = self.relu(x)

        # Node / Graph pooling
        if batch is not None:
            # Group by batch id or mean
            unique_batches = torch.unique(batch)
            pooled = []
            for b in unique_batches:
                mask = (batch == b)
                pooled.append(torch.mean(x[mask], dim=0, keepdim=True))
            x = torch.cat(pooled, dim=0)
        else:
            # Mean pool across nodes
            x = torch.mean(x, dim=0, keepdim=True)

        # Dense classification
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        x = self.sigmoid(x)

        return x

    def save(self, filepath):
        """Save model weights."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        torch.save(self.state_dict(), filepath)
        print(f"Model saved to {filepath}")

    @classmethod
    def load(cls, filepath, input_dim, **kwargs):
        """Load model weights."""
        model = cls(input_dim, **kwargs)
        model.load_state_dict(torch.load(filepath, map_location=torch.device('cpu')))
        model.eval()
        print(f"Model loaded from {filepath}")
        return model


class GNNTrainer:
    """Trainer for the fraud detection GNN model."""

    def __init__(self, model, device='cpu', lr=0.001):
        self.model = model.to(device)
        self.device = device
        self.optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
        self.criterion = nn.BCELoss()

    def train_epoch(self, data_list):
        """Train for one epoch over list of subgraphs."""
        self.model.train()
        total_loss = 0.0
        total_correct = 0
        total_samples = 0

        for item in data_list:
            x = item['x'].to(self.device)
            edge_index = item['edge_index'].to(self.device)
            y = item['y'].to(self.device)

            self.optimizer.zero_grad()
            out = self.model(x, edge_index)
            loss = self.criterion(out.squeeze(), y.squeeze())
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += loss.item()
            pred = (out.squeeze() > 0.5).float()
            total_correct += (pred == y.squeeze()).sum().item()
            total_samples += 1

        avg_loss = total_loss / max(1, total_samples)
        accuracy = total_correct / max(1, total_samples)
        return avg_loss, accuracy

    def evaluate(self, data_list):
        """Evaluate validation performance."""
        self.model.eval()
        total_loss = 0.0
        total_correct = 0
        total_samples = 0

        with torch.no_grad():
            for item in data_list:
                x = item['x'].to(self.device)
                edge_index = item['edge_index'].to(self.device)
                y = item['y'].to(self.device)

                out = self.model(x, edge_index)
                loss = self.criterion(out.squeeze(), y.squeeze())

                total_loss += loss.item()
                pred = (out.squeeze() > 0.5).float()
                total_correct += (pred == y.squeeze()).sum().item()
                total_samples += 1

        avg_loss = total_loss / max(1, total_samples)
        accuracy = total_correct / max(1, total_samples)
        return avg_loss, accuracy
