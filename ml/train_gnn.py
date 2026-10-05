"""
Full-featured training script and dataset synthesizer for the fraud detection GNN.
Works with standard Python libraries + PyTorch + NumPy.
"""
import argparse
import os
import pickle
from pathlib import Path
import numpy as np
import torch

from ml.preprocessor import TransactionPreprocessor, GraphBuilder
from ml.gnn_model import FraudDetectionGNN, GNNTrainer


def generate_synthetic_records(num_samples=2500, random_seed=42):
    """Generate realistic synthetic credit card & payment records."""
    np.random.seed(random_seed)

    num_customers = max(40, num_samples // 25)
    num_merchants = max(20, num_samples // 50)
    num_cards = max(50, num_samples // 20)

    customer_pool = [f"CUST_{i:04d}" for i in range(num_customers)]
    merchant_pool = [f"MERCH_{i:04d}" for i in range(num_merchants)]
    card_pool = [f"CARD_{i:04d}" for i in range(num_cards)]

    cust_card_map = {cust: np.random.choice(card_pool, size=np.random.randint(1, 3)).tolist() for cust in customer_pool}
    risky_merchants = set(np.random.choice(merchant_pool, size=max(2, num_merchants // 10), replace=False))
    risky_customers = set(np.random.choice(customer_pool, size=max(3, num_customers // 15), replace=False))

    categories = ['shopping', 'electronics', 'travel', 'groceries', 'luxury', 'dining', 'crypto_cashout']
    channels = ['UPI', 'Card', 'Net Banking', 'POS', 'Wallet']

    records = []
    base_time = 1700000000

    for i in range(num_samples):
        is_risky_cust = np.random.rand() < 0.15
        cust = np.random.choice(list(risky_customers)) if is_risky_cust else np.random.choice(customer_pool)
        card = np.random.choice(cust_card_map[cust])
        merch = np.random.choice(list(risky_merchants)) if (is_risky_cust and np.random.rand() < 0.6) else np.random.choice(merchant_pool)
        category = 'luxury' if is_risky_cust and np.random.rand() < 0.4 else np.random.choice(categories)
        channel = np.random.choice(channels)

        if cust in risky_customers and merch in risky_merchants:
            is_fraud = 1 if np.random.rand() < 0.85 else 0
        elif cust in risky_customers or merch in risky_merchants or category in ['luxury', 'crypto_cashout']:
            is_fraud = 1 if np.random.rand() < 0.50 else 0
        else:
            is_fraud = 1 if np.random.rand() < 0.02 else 0

        if is_fraud:
            amount = float(np.random.exponential(scale=18000) + 10000)
        else:
            amount = float(np.random.exponential(scale=1800) + 120)

        row = {
            'Time': base_time + i * 120,
            'Customer': cust,
            'Merchant': merch,
            'Card': card,
            'Amount': round(amount, 2),
            'Category': category,
            'Channel': channel,
            'Class': is_fraud
        }

        for v_idx in range(1, 29):
            if is_fraud:
                row[f'V{v_idx}'] = float(np.random.normal(loc=1.8 if v_idx % 2 == 0 else -1.8, scale=1.4))
            else:
                row[f'V{v_idx}'] = float(np.random.normal(loc=0.0, scale=1.0))

        records.append(row)

    return records


def build_graph_samples(records, X, y, window_size=60):
    """Slice transaction stream into connected graph sub-units."""
    data_list = []
    total = len(records)

    for start_idx in range(0, total, window_size):
        sub_records = records[start_idx : start_idx + window_size]
        sub_X = X[start_idx : start_idx + window_size]
        sub_y = y[start_idx : start_idx + window_size]

        if len(sub_records) < 4:
            continue

        graph_builder = GraphBuilder(sub_records)
        built = graph_builder.build_graph()

        num_nodes = max(built['num_nodes'], 1)
        num_features = sub_X.shape[1]
        node_features = np.zeros((num_nodes, num_features), dtype=np.float32)

        for loc_idx, r in enumerate(sub_records):
            c_node = built['node_maps']['customers'].get(r['Customer'], 0)
            m_node = built['node_maps']['merchants'].get(r['Merchant'], 0)
            k_node = built['node_maps']['cards'].get(r['Card'], 0)
            feat = sub_X[loc_idx]

            node_features[c_node] += feat
            node_features[m_node] += feat
            node_features[k_node] += feat

        # Normalize node embeddings
        norms = np.linalg.norm(node_features, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        node_features = node_features / norms

        edges = built['edges']
        if edges.size > 0:
            edge_src = np.concatenate([edges[0], edges[1]])
            edge_dst = np.concatenate([edges[1], edges[0]])
            edge_index = torch.tensor(np.vstack([edge_src, edge_dst]), dtype=torch.long)
        else:
            edge_index = torch.empty((2, 0), dtype=torch.long)

        x_tensor = torch.tensor(node_features, dtype=torch.float32)
        y_val = torch.tensor([1.0 if np.any(sub_y == 1.0) else 0.0], dtype=torch.float32)

        data_list.append({
            'x': x_tensor,
            'edge_index': edge_index,
            'y': y_val
        })

    return data_list


def train(args):
    print("=" * 60)
    print("Starting Fraud Detection GNN Training Pipeline")
    print("=" * 60)

    preproc = TransactionPreprocessor()

    if args.synthetic or not args.data or not os.path.exists(args.data):
        print(f"Generating {args.samples} synthetic transactions...")
        records = generate_synthetic_records(num_samples=args.samples)
    else:
        print(f"Loading transactions from {args.data}...")
        records = preproc.load_kaggle_data(args.data)

    X, y, feature_cols = preproc.preprocess_records(records)
    input_dim = X.shape[1]
    print(f"Total processed transactions: {len(records)}, Input Dimension: {input_dim}")

    full_graph_builder = GraphBuilder(records)
    full_graph = full_graph_builder.build_graph()

    data_list = build_graph_samples(records, X, y, window_size=args.window_size)
    print(f"Created {len(data_list)} connected relational subgraphs.")

    split = int(0.8 * len(data_list))
    train_data = data_list[:split]
    val_data = data_list[split:] if split < len(data_list) else data_list

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Training on device: {device}")

    model = FraudDetectionGNN(
        input_dim=input_dim,
        hidden_dim=args.hidden_dim,
        output_dim=1,
        num_layers=args.layers,
        dropout=0.2
    )

    trainer = GNNTrainer(model, device=device, lr=args.lr)

    print("\n--- Training Progress ---")
    best_loss = float('inf')

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = trainer.train_epoch(train_data)
        val_loss, val_acc = trainer.evaluate(val_data)
        print(f"Epoch {epoch:02d}/{args.epochs:02d} | Train Loss: {train_loss:.4f} Acc: {train_acc:.3f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.3f}")

        if val_loss < best_loss:
            best_loss = val_loss

    out_path = Path(args.output)
    out_dir = out_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    model.save(str(out_path))

    scaler_path = out_dir / "scaler.pkl"
    with open(scaler_path, "wb") as f:
        pickle.dump(preproc.scaler, f)
    print(f"Scaler saved to {scaler_path}")

    graph_path = out_dir / "graph_data.pkl"
    with open(graph_path, "wb") as f:
        pickle.dump({
            "num_nodes": full_graph["num_nodes"],
            "node_maps": full_graph["node_maps"],
            "feature_cols": feature_cols,
            "input_dim": input_dim
        }, f)
    print(f"Graph metadata saved to {graph_path}")
    print("\nTraining completed successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Fraud Detection GNN")
    parser.add_argument("--data", default=None, help="Path to transaction CSV")
    parser.add_argument("--synthetic", action="store_true", default=True, help="Use synthetic dataset if true")
    parser.add_argument("--samples", type=int, default=2500, help="Number of synthetic samples")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--window-size", type=int, default=60, help="Window size per graph partition")
    parser.add_argument("--hidden-dim", type=int, default=64, help="GNN hidden channels")
    parser.add_argument("--layers", type=int, default=3, help="Number of GNN layers")
    parser.add_argument("--lr", type=float, default=0.003, help="Learning rate")
    parser.add_argument("--output", default="ml/models/fraud_detector.pt", help="Model output path")
    args = parser.parse_args()

    train(args)
