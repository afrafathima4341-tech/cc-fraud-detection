import numpy as np
from pathlib import Path


class SimpleStandardScaler:
    """Pure numpy standard scaler to avoid hard scikit-learn dependency."""
    def __init__(self):
        self.mean_ = None
        self.scale_ = None

    def fit(self, X):
        X = np.asarray(X, dtype=np.float32)
        self.mean_ = np.mean(X, axis=0)
        self.scale_ = np.std(X, axis=0)
        self.scale_[self.scale_ == 0.0] = 1.0
        return self

    def transform(self, X):
        X = np.asarray(X, dtype=np.float32)
        if self.mean_ is None or self.scale_ is None:
            return X
        return (X - self.mean_) / self.scale_

    def fit_transform(self, X):
        return self.fit(X).transform(X)


class TransactionPreprocessor:
    """Preprocesses credit card & payment transaction records for GNN training."""

    def __init__(self):
        self.scaler = SimpleStandardScaler()
        self.feature_cols = []

    def load_kaggle_data(self, filepath):
        """Load CSV credit card fraud dataset using standard csv parser or numpy."""
        import csv
        records = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
        print(f"Loaded {len(records)} transactions from {filepath}")
        return records

    def preprocess_records(self, records):
        """Preprocess list of transaction dicts."""
        n = len(records)
        amounts = np.array([float(r.get('Amount', r.get('amount', 0.0))) for r in records], dtype=np.float32).reshape(-1, 1)
        amount_scaled = self.scaler.fit_transform(amounts)

        # Build feature matrix
        # Columns V1..V28 if available, else synthetic PCA proxies
        v_features = []
        for v in range(1, 29):
            col_name = f'V{v}'
            if n > 0 and col_name in records[0]:
                vals = [float(r[col_name]) for r in records]
            else:
                vals = [0.0] * n
            v_features.append(vals)

        v_matrix = np.array(v_features, dtype=np.float32).T  # shape (N, 28)
        X = np.hstack([v_matrix, amount_scaled])  # shape (N, 29)

        labels = []
        for r in records:
            cls_val = r.get('Class', r.get('class', r.get('is_fraud', 0)))
            labels.append(1.0 if str(cls_val) in ['1', 'True', 'true'] else 0.0)

        y = np.array(labels, dtype=np.float32)
        self.feature_cols = [f'V{i}' for i in range(1, 29)] + ['amount_scaled']
        return X, y, self.feature_cols


class GraphBuilder:
    """Builds customer-merchant-card transaction graph data structures."""

    def __init__(self, transactions_data):
        """
        Args:
            transactions_data: list of dicts with customer_id, merchant_id, card_id, amount
        """
        self.transactions = transactions_data
        self.customer_node_map = {}
        self.merchant_node_map = {}
        self.card_node_map = {}

    def build_graph(self):
        """Build customer-merchant-card transaction graph."""
        edges = []
        edge_features = []
        node_count = 0

        # Unique nodes
        customers = sorted(list(set(r.get('customer_id', r.get('Customer', '')) for r in self.transactions if r.get('customer_id', r.get('Customer')))))
        merchants = sorted(list(set(r.get('merchant_id', r.get('Merchant', '')) for r in self.transactions if r.get('merchant_id', r.get('Merchant')))))
        cards = sorted(list(set(r.get('card_id', r.get('Card', '')) for r in self.transactions if r.get('card_id', r.get('Card')))))

        for c in customers:
            self.customer_node_map[c] = node_count
            node_count += 1

        for m in merchants:
            self.merchant_node_map[m] = node_count
            node_count += 1

        for k in cards:
            self.card_node_map[k] = node_count
            node_count += 1

        for r in self.transactions:
            c = r.get('customer_id', r.get('Customer'))
            m = r.get('merchant_id', r.get('Merchant'))
            k = r.get('card_id', r.get('Card'))
            amt = float(r.get('amount', r.get('Amount', 0.0)))

            if c in self.customer_node_map and m in self.merchant_node_map:
                edges.append([self.customer_node_map[c], self.merchant_node_map[m]])
                edge_features.append([amt, 1.0])

            if c in self.customer_node_map and k in self.card_node_map:
                edges.append([self.customer_node_map[c], self.card_node_map[k]])
                edge_features.append([amt, 2.0])

            if k in self.card_node_map and m in self.merchant_node_map:
                edges.append([self.card_node_map[k], self.merchant_node_map[m]])
                edge_features.append([amt, 3.0])

        return {
            'edges': np.array(edges, dtype=np.int64).T if edges else np.empty((2, 0), dtype=np.int64),
            'edge_features': np.array(edge_features, dtype=np.float32) if edge_features else np.empty((0, 2), dtype=np.float32),
            'num_nodes': node_count,
            'node_maps': {
                'customers': self.customer_node_map,
                'merchants': self.merchant_node_map,
                'cards': self.card_node_map,
            }
        }
