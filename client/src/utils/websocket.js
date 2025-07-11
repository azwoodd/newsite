/**
 * A utility class for handling WebSocket connections with proper reconnection logic
 */
class WebSocketService {
    constructor() {
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectInterval = 1000; // Start with 1 second, will increase with backoff
      this.listeners = {
        message: [],
        connect: [],
        disconnect: [],
        error: []
      };
      this._lastConnectParams = null; // To store parameters for reconnection
      this.messageQueue = []; // Queue for messages when socket isn't connected
      
      // Auto-reconnect on window focus - but only if we had previously connected
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
          if (!this.isConnected && this._lastConnectParams) {
            console.log('Window focused, attempting to reconnect WebSocket');
            this.reconnect();
          }
        });
      }
    }
  
    /**
     * Connect to the WebSocket server
     * @param {string} token - JWT token for authentication
     * @param {number} userId - User ID
     * @param {boolean} isAdmin - Whether the user is an admin
     * @returns {Promise} - Resolves when connected
     */
    connect(token, userId, isAdmin = false) {
      // Save these parameters for reconnection
      this._lastConnectParams = { token, userId, isAdmin };
      
      return new Promise((resolve, reject) => {
        try {
          if (this.socket && this.isConnected) {
            console.log('WebSocket already connected, reusing connection');
            resolve(this.socket);
            return;
          }
  
          // Clean up any existing socket
          if (this.socket) {
            this.socket.close();
            this.socket = null;
          }
  
          // Check for SSL and adjust protocol accordingly
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const socketUrl = `${protocol}//${window.location.host}/ws/helpdesk`;
  
          console.log('Creating new WebSocket connection to:', socketUrl);
          this.socket = new WebSocket(socketUrl);
  
          this.socket.onopen = () => {
            console.log('WebSocket connection established');
            this.isConnected = true;
            this.reconnectAttempts = 0;
  
            // Authenticate with server
            const authData = {
              type: 'authenticate',
              data: {
                userId,
                token,
                isAdmin
              }
            };
            
            console.log('Sending authentication data:', { userId, isAdmin, hasToken: !!token });
            this.socket.send(JSON.stringify(authData));
  
            // Process any queued messages
            this._processQueue();
            
            // Notify listeners
            this._notifyListeners('connect');
            resolve(this.socket);
          };
  
          this.socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('WebSocket message received:', data);
              
              // Special handling for auth_success to immediately start pinging
              if (data.type === 'auth_success') {
                this.startPingInterval(15000); // Start pinging every 15 seconds
              }
              
              // Notify all listeners about this message
              this._notifyListeners('message', data);
            } catch (err) {
              console.error('Error parsing WebSocket message:', err);
            }
          };
  
          this.socket.onclose = (event) => {
            console.log('WebSocket connection closed', event.code, event.reason);
            this.isConnected = false;
            this.stopPingInterval();
            
            // Only attempt to reconnect if we have connection params
            if (this._lastConnectParams) {
              this._attemptReconnect();
            }
            
            // Notify listeners
            this._notifyListeners('disconnect');
          };
  
          this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this._notifyListeners('error', error);
            
            if (!this.isConnected) {
              reject(error);
            }
          };
        } catch (err) {
          console.error('Error creating WebSocket connection:', err);
          reject(err);
        }
      });
    }
  
    /**
     * Reconnect with the same parameters as before
     */
    reconnect() {
      if (this._lastConnectParams) {
        const { token, userId, isAdmin } = this._lastConnectParams;
        return this.connect(token, userId, isAdmin);
      } else {
        console.error('Cannot reconnect - no previous connection parameters');
        return Promise.reject(new Error('No previous connection parameters'));
      }
    }
  
    /**
     * Send a message through the WebSocket
     * @param {string} type - Message type
     * @param {object} data - Message data
     * @returns {boolean} - Whether the message was sent
     */
    send(type, data) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket is not connected, queuing message');
        this.messageQueue.push({ type, data });
        // Try to reconnect
        this.reconnect().catch(() => {
          console.log('Reconnection failed, message queued for later delivery');
        });
        return false;
      }
  
      try {
        this.socket.send(JSON.stringify({
          type,
          data
        }));
        return true;
      } catch (err) {
        console.error('Error sending WebSocket message:', err);
        return false;
      }
    }
  
    /**
     * Process queued messages
     * @private
     */
    _processQueue() {
      if (this.messageQueue.length === 0) return;
      
      console.log(`Processing ${this.messageQueue.length} queued messages`);
      
      // Create a copy of the queue and clear the original
      const queue = [...this.messageQueue];
      this.messageQueue = [];
      
      // Process each message
      queue.forEach(({ type, data }) => {
        this.send(type, data);
      });
    }
    
    /**
     * Close the WebSocket connection
     */
    disconnect() {
      this.stopPingInterval();
      if (this.socket) {
        this.socket.close();
        this.socket = null;
        this.isConnected = false;
      }
    }
  
    /**
     * Add a listener for WebSocket events
     * @param {string} event - Event name (message, connect, disconnect, error)
     * @param {function} callback - Callback function
     */
    addEventListener(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
  
    /**
     * Remove a listener for WebSocket events
     * @param {string} event - Event name
     * @param {function} callback - Callback function to remove
     */
    removeEventListener(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }
  
    /**
     * Notify all listeners of an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @private
     */
    _notifyListeners(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error(`Error in ${event} listener:`, err);
          }
        });
      }
    }
  
    /**
     * Attempt to reconnect to the WebSocket server
     * @private
     */
    _attemptReconnect() {
      if (!this._lastConnectParams) {
        console.error('Cannot reconnect without connection parameters');
        return;
      }
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        // Exponential backoff - increase delay with each attempt
        const delay = Math.min(
          30000, // Max 30 seconds
          this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
        );
        
        setTimeout(() => {
          const { token, userId, isAdmin } = this._lastConnectParams;
          this.connect(token, userId, isAdmin).catch(() => {
            // Connection failed, retry handled by onclose
          });
        }, delay);
      } else {
        console.error('Max reconnect attempts reached');
      }
    }
  
    /**
     * Keep the connection alive by sending a ping
     */
    ping() {
      return this.send('ping', { timestamp: Date.now() });
    }
  
    /**
     * Start sending periodic pings to keep the connection alive
     * @param {number} interval - Ping interval in milliseconds
     */
    startPingInterval(interval = 15000) {
      // Clear any existing interval first
      this.stopPingInterval();
      
      this.pingInterval = setInterval(() => {
        if (this.isConnected) {
          this.ping();
        } else {
          console.log('WebSocket not connected, skipping ping');
        }
      }, interval);
      
      console.log(`Started ping interval (${interval}ms)`);
    }
  
    /**
     * Stop sending periodic pings
     */
    stopPingInterval() {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
        console.log('Stopped ping interval');
      }
    }
  }
  
  // Create a singleton instance
  const webSocketService = new WebSocketService();
  
  export default webSocketService;