const normalize = (value) => String(value || '').trim().toLowerCase()

function maskUpiId(value) {
  const [name = '', handle = ''] = String(value || '').split('@')
  const maskedName = name.length > 1 ? `${name[0]}***` : '***'
  return `${maskedName}@${handle || 'upi'}`
}

export function buildTransactionGraph(transactions = []) {
  const nodes = new Map()
  const links = new Map()

  const addNode = (id, type, label, transaction, filter = null) => {
    let node = nodes.get(id)
    if (!node) {
      node = {
        id,
        type,
        label,
        queryKey: filter?.queryKey,
        queryValue: filter?.queryValue,
        transactionCount: 0,
        fraudCount: 0,
        transactionIds: new Set(),
      }
      nodes.set(id, node)
    }
    if (!node.transactionIds.has(transaction.id)) {
      node.transactionIds.add(transaction.id)
      node.transactionCount += 1
      if (transaction.is_fraud_predicted) node.fraudCount += 1
    }
    return node
  }

  const addLink = (source, target, type, transaction) => {
    const id = `${source}->${target}:${type}`
    let link = links.get(id)
    if (!link) {
      link = { id, source, target, type, transactionCount: 0, fraudCount: 0 }
      links.set(id, link)
    }
    if (link.lastTransactionId !== transaction.id) {
      link.lastTransactionId = transaction.id
      link.transactionCount += 1
      if (transaction.is_fraud_predicted) link.fraudCount += 1
    }
  }

  for (const transaction of transactions) {
    if (!transaction?.id || !transaction.customer_id || !transaction.merchant_id) continue

    const customerId = `customer:${normalize(transaction.customer_id)}`
    const merchantId = `merchant:${normalize(transaction.merchant_id)}`
    addNode(customerId, 'customer', transaction.customer_id, transaction, {
      queryKey: 'customer_id',
      queryValue: transaction.customer_id,
    })
    addNode(merchantId, 'merchant', transaction.merchant_name || transaction.merchant_id, transaction, {
      queryKey: 'merchant_id',
      queryValue: transaction.merchant_id,
    })

    let instrumentId
    const channel = String(transaction.channel || '').trim()
    if (transaction.upi_id) {
      instrumentId = `upi:${normalize(transaction.upi_id)}`
      addNode(instrumentId, 'upi', maskUpiId(transaction.upi_id), transaction)
      if (transaction.payer_bank) {
        const payerBankId = `bank:${normalize(transaction.payer_bank)}`
        addNode(payerBankId, 'bank', transaction.payer_bank, transaction)
        addLink(instrumentId, payerBankId, 'payer bank', transaction)
      }
    } else if (transaction.card_id) {
      instrumentId = `card:${normalize(transaction.card_id)}`
      const suffix = transaction.card_last4 ? ` ****${transaction.card_last4}` : ''
      addNode(instrumentId, 'card', `${transaction.card_network || 'Card'}${suffix}`, transaction)
      if (transaction.card_network) {
        const networkId = `network:${normalize(transaction.card_network)}`
        addNode(networkId, 'network', transaction.card_network, transaction)
        addLink(instrumentId, networkId, 'network', transaction)
      }
    } else if (channel) {
      instrumentId = `channel:${normalize(channel)}`
      addNode(instrumentId, 'channel', channel, transaction)
    }

    if (instrumentId) {
      addLink(customerId, instrumentId, 'uses', transaction)
      addLink(instrumentId, merchantId, 'pays', transaction)
    } else {
      addLink(customerId, merchantId, 'transacts with', transaction)
    }

    if (transaction.merchant_bank) {
      const merchantBankId = `bank:${normalize(transaction.merchant_bank)}`
      addNode(merchantBankId, 'bank', transaction.merchant_bank, transaction)
      addLink(merchantId, merchantBankId, 'merchant bank', transaction)
    }
  }

  return {
    nodes: [...nodes.values()].map(({ transactionIds, ...node }) => node),
    links: [...links.values()].map(({ lastTransactionId, ...link }) => link),
  }
}
