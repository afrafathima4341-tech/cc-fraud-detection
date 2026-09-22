import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

class TransactionPreprocessor:
    """Preprocesses credit card transaction data for GNN training."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.le_merchant = LabelEncoder()
        self.le_category = LabelEncoder()

    def load_kaggle_data(self, filepath):
        """Load Kaggle credit card fraud dataset."""
        df = pd.read_csv(filepath)
        print(f"Loaded {len(df)} transactions")
        return df

    def preprocess(self, df):
        """Preprocess the dataset."""
        # Handle missing values
        df = df.fillna(0)

        # Feature engineering
        df['amount_scaled'] = self.scaler.fit_transform(df[['Amount']])

        # Time-based features
        if 'Time' in df.columns:
            df['hour'] = (df['Time'] // 3600) % 24
            df['day'] = (df['Time'] // 86400) % 30

        # Encode categorical features
        if 'Merchant' in df.columns:
            df['merchant_encoded'] = self.le_merchant.fit_transform(df['Merchant'].astype(str))

        # Select features
        feature_cols = [col for col in df.columns if col.startswith('V')]
        feature_cols.extend(['amount_scaled'])
        if 'hour' in df.columns:
            feature_cols.extend(['hour', 'day'])

        X = df[feature_cols].values
        y = df['Class'].values if 'Class' in df.columns else np.zeros(len(df))

        print(f"Features: {len(feature_cols)}")
        print(f"Fraud rate: {(y.sum() / len(y) * 100):.2f}%")

        return X, y, feature_cols

    def create_train_test_split(self, X, y, test_size=0.2, random_state=42):
        """Split data into train and test sets."""
        return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)


class GraphBuilder:
    """Builds graph representation from transactions."""

    def __init__(self, transaction_data):
        self.transactions = transaction_data
        self.customer_node_map = {}
        self.merchant_node_map = {}
        self.card_node_map = {}
        self.next_node_id = 0

    def build_graph(self):
        """Build customer-merchant-card transaction graph."""
        edges = []
        edge_features = []
        node_count = 0

        # Create nodes
        customers = self.transactions['customer_id'].unique()
        merchants = self.transactions['merchant_id'].unique()
        cards = self.transactions['card_id'].unique()

        # Map node IDs
        for customer in customers:
            self.customer_node_map[customer] = node_count
            node_count += 1

        merchant_offset = node_count
        for merchant in merchants:
            self.merchant_node_map[merchant] = node_count
            node_count += 1

        card_offset = node_count
        for card in cards:
            self.card_node_map[card] = node_count
            node_count += 1

        # Create edges: customer -> merchant, customer -> card, card -> merchant
        for _, row in self.transactions.iterrows():
            customer_node = self.customer_node_map[row['customer_id']]
            merchant_node = self.merchant_node_map[row['merchant_id']]
            card_node = self.card_node_map[row['card_id']]

            # Customer to Merchant
            edges.append([customer_node, merchant_node])
            edge_features.append([row['amount'], 1.0])  # edge_type: customer-merchant

            # Customer to Card
            edges.append([customer_node, card_node])
            edge_features.append([row['amount'], 2.0])  # edge_type: customer-card

            # Card to Merchant
            edges.append([card_node, merchant_node])
            edge_features.append([row['amount'], 3.0])  # edge_type: card-merchant

        print(f"Graph nodes: {node_count}")
        print(f"Graph edges: {len(edges)}")

        return {
            'edges': np.array(edges).T if edges else np.array([[], []]),
            'edge_features': np.array(edge_features) if edge_features else np.array([]),
            'num_nodes': node_count,
            'node_maps': {
                'customers': self.customer_node_map,
                'merchants': self.merchant_node_map,
                'cards': self.card_node_map,
            }
        }

    def get_node_id(self, entity_type, entity_id):
        """Get node ID for a given entity."""
        if entity_type == 'customer':
            return self.customer_node_map.get(entity_id)
        elif entity_type == 'merchant':
            return self.merchant_node_map.get(entity_id)
        elif entity_type == 'card':
            return self.card_node_map.get(entity_id)
        return None
