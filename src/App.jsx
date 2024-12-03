import React, { useState, useEffect } from 'react';
import { Routex, Network, getDefaultClient, FA_ADDRESSES } from "@routexio/sdk";
import { AptosConnectButton, useAptosWallet, useAptosAccountBalance } from '@razorlabs/wallet-kit';
import './App.css';

function App() {
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [allTokens, setAllTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routing, setRouting] = useState(null);
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('FA'); // 'FA' or 'COIN'
  const wallet = useAptosWallet();
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // 初始化代币列表
  useEffect(() => {
    const initTokens = async () => {
      try {
        const client = getDefaultClient(Network.Porto);
        const routex = new Routex({ client, network: Network.Porto });
        
        // 获取所有FA代币
        const fas = await routex.getFungibleAssets();
        console.log('可用的FA代币:', fas);
        
        // 获取所有Coin代币
        const coins = await routex.getCoins();
        console.log('可用的Coin代币:', coins);
        
        // 处理代币列表
        const processedTokens = [
          // 处理FA代币
          ...fas.map(token => ({
            address: token.address?.toString() || '',
            name: token.name || token.symbol || 'Unknown Token',
            symbol: token.symbol || '',
            decimal: token.decimal || 8,
            logo: token.logo || '',
            type: 'FA'
          })),
          // 处理Coin代币
          ...coins.map(coin => ({
            address: coin.type_,
            name: coin.name || 'Unknown Token',
            symbol: coin.symbol || 'Unknown',
            decimal: coin.decimal || 8,
            logo: coin.logo || '',
            type: coin.type_.includes('0x1::aptos_coin::AptosCoin') ? 'MOVE' : 'COIN'
          }))
        ];

        console.log('处理后的所有代币:', processedTokens);
        setAllTokens(processedTokens);

      } catch (error) {
        console.error('初始化代币列表失败:', error);
      }
    };

    initTokens();
  }, []);

  // 获取当前标签页可用的代币
  const getTokensByTab = (tab) => {
    return allTokens.filter(token => {
      if (tab === 'FA') return token.type === 'FA';
      return token.type === 'MOVE' || token.type === 'COIN';
    });
  };

  // 获取可选的目标代币列表（始终返回FA代币）
  const getAvailableToTokens = (fromTokenInfo) => {
    if (!fromTokenInfo) return [];
    // 始终返回FA代币列表，但排除当前选择的代币（如果它是FA代币）
    return allTokens.filter(t => 
      t.type === 'FA' && 
      (fromTokenInfo.type !== 'FA' || t.address !== fromTokenInfo.address)
    );
  };

  // 当切换标签页时重置选择
  useEffect(() => {
    setFromToken('');
    setToToken('');
    setEstimatedAmount('');
    setRouting(null);
  }, [activeTab]);

  // 获取预计兑换数量
  useEffect(() => {
    const debounceTimeout = setTimeout(async () => {
      if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
        setRouting(null);
        setEstimatedAmount('');
        return;
      }
      
      setIsCalculating(true);
      try {
        const client = getDefaultClient(Network.Porto);
        const routex = new Routex({ client, network: Network.Porto });
        
        const fromTokenInfo = allTokens.find(t => t.address === fromToken);
        const toTokenInfo = allTokens.find(t => t.address === toToken);
        
        console.log('交换类型:', {
          from: fromTokenInfo?.type,
          to: toTokenInfo?.type,
          fromToken,
          toToken,
          amount
        });

        const decimal = fromTokenInfo?.decimal || 8;
        const amountWithDecimal = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimal)));
        
        console.log('请求路由参数:', {
          fromToken,
          toToken,
          amountWithDecimal: amountWithDecimal.toString(),
          fromTokenInfo,
          toTokenInfo
        });

        const routingInfo = await routex.getRouting(fromToken, toToken, amountWithDecimal);
        console.log('获取到的路由信息:', {
          ...routingInfo,
          amount_in: routingInfo.amount_in?.toString(),
          amount_out: routingInfo.amount_out?.toString()
        });

        if (routingInfo && routingInfo.amount_out) {
          const toDecimal = toTokenInfo?.decimal || 8;
          const estimatedAmountFormatted = (Number(routingInfo.amount_out) / Math.pow(10, toDecimal)).toFixed(6);
          console.log('计算结果:', {
            toTokenInfo,
            toDecimal,
            estimatedAmountFormatted
          });
          setRouting(routingInfo);
          setEstimatedAmount(estimatedAmountFormatted);
        }
      } catch (error) {
        console.error('获取路由失败:', error);
        setRouting(null);
        setEstimatedAmount('');
      } finally {
        setIsCalculating(false);
      }
    }, 2000); // 增加防抖时间到2秒

    return () => clearTimeout(debounceTimeout);
  }, [fromToken, toToken, amount, allTokens]);

  // 显示通知
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  const handleSwap = async () => {
    if (!wallet.connected) {
      showNotification('error', 'Please connect your wallet first');
      return;
    }

    if (!routing) {
      showNotification('error', 'Please wait for route calculation');
      return;
    }

    try {
      setIsLoading(true);
      const client = getDefaultClient(Network.Porto);
      const routex = new Routex({ client, network: Network.Porto });

      const fromTokenInfo = allTokens.find(t => t.address === fromToken);
      const toTokenInfo = allTokens.find(t => t.address === toToken);
      
      console.log('Executing swap:', {
        fromType: fromTokenInfo?.type,
        toType: toTokenInfo?.type,
        routing
      });

      showNotification('info', 'Please confirm the transaction in your wallet');
      const txnPayload = await routex.swapWithRouting(routing, 5);
      
      const transaction = await wallet.signAndSubmitTransaction({
        payload: txnPayload
      });

      console.log('Transaction submitted:', transaction);
      console.log('Transaction args:', transaction?.args);
      console.log('Transaction hash:', transaction?.args?.hash);
      console.log('Full transaction object:', JSON.stringify(transaction, null, 2));
      
      if (!transaction?.args?.hash) {
        console.error('Transaction object structure:', {
          hasArgs: !!transaction?.args,
          argsKeys: transaction?.args ? Object.keys(transaction.args) : [],
          fullTransaction: transaction
        });
        throw new Error('Failed to get transaction hash');
      }

      showNotification('info', `Transaction submitted with hash: ${transaction.args.hash}`);

      // 等待交易确认
      await client.waitForTransaction({
        transactionHash: transaction.args.hash
      });
      
      showNotification('success', `Swap successful! ${amount} ${fromTokenInfo.symbol} → ${estimatedAmount} ${toTokenInfo.symbol}`);
      setAmount('');
      setEstimatedAmount('');
      setRouting(null);

    } catch (error) {
      console.error('Swap failed:', error);
      if (error.message?.includes('User rejected')) {
        showNotification('error', 'Transaction rejected by user');
      } else {
        showNotification('error', 'Swap failed: ' + (error.message || 'Please try again'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="wallet-connect">
          <div style={{ minHeight: '40px' }}>
            <AptosConnectButton />
          </div>
        </div>
      </div>

      <div className="swap-container">
        <h1>PicWe Swap</h1>
        
        <div className="token-tabs">
          <button 
            className={activeTab === 'FA' ? 'active' : ''} 
            onClick={() => setActiveTab('FA')}
          >
            FA Tokens
          </button>
          <button 
            className={activeTab === 'COIN' ? 'active' : ''} 
            onClick={() => setActiveTab('COIN')}
          >
            Coin Tokens
          </button>
        </div>
        
        <div className="swap-form">
          <div className="input-group">
            <div className="token-select">
              <select 
                value={fromToken}
                onChange={(e) => {
                  setFromToken(e.target.value);
                  setToToken('');
                }}
              >
                <option value="">Select Token</option>
                {getTokensByTab(activeTab).map(token => (
                  <option key={token.address} value={token.address}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
              {fromToken && allTokens.find(t => t.address === fromToken)?.logo && (
                <img 
                  src={allTokens.find(t => t.address === fromToken)?.logo} 
                  alt="" 
                  className="token-logo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
            />
          </div>

          <div className="swap-arrow">↓</div>

          <div className="input-group">
            <div className="token-select">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
              >
                <option value="">Select FA Token</option>
                {fromToken && getAvailableToTokens(allTokens.find(t => t.address === fromToken))
                  .map(token => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
              </select>
              {toToken && allTokens.find(t => t.address === toToken)?.logo && (
                <img 
                  src={allTokens.find(t => t.address === toToken)?.logo} 
                  alt="" 
                  className="token-logo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
            <input
              type="text"
              value={estimatedAmount || '0.0'}
              readOnly
              placeholder="0.0"
            />
          </div>

          {routing && routing.routers && (
            <div className="routing-info">
              <h3>Route Path</h3>
              <div className="route-path">
                {routing.routers.map((router, index) => (
                  <span key={index}>
                    {router.name}
                    {index < routing.routers.length - 1 ? ' → ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleSwap}
            disabled={isLoading || !fromToken || !toToken || !amount || !routing || !wallet.connected || isCalculating}
            style={{ minHeight: '50px' }}
          >
            {!wallet.connected ? 'Connect Wallet' : 
              isLoading ? 'Swapping...' : 
              isCalculating ? 'Calculating...' : 
              'Swap'}
          </button>
        </div>

        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;