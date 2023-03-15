class TikTokIOConnection {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.socket = null;
    this.uniqueId = null;
    this.options = null;
    this.connected = false;

    this.connect = this.connect.bind(this);
    this.setUniqueId = this.setUniqueId.bind(this);

    this.connect();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.backendUrl);

      this.socket.on('connect', () => {
        console.info('Socket connected!');
        this.connected = true;

        // Reconnect to streamer if uniqueId already set
        if (this.uniqueId) {
          this.setUniqueId();
        }

        resolve();
      });

      this.socket.on('disconnect', () => {
        console.warn('Socket disconnected!');
        this.connected = false;
      });

      this.socket.on('streamEnd', () => {
        console.warn('LIVE has ended!');
        this.uniqueId = null;
      });

      this.socket.on('tiktokDisconnected', (errMsg) => {
        console.warn(errMsg);
        if (errMsg && errMsg.includes('LIVE has ended')) {
          this.uniqueId = null;
        }
      });

      setTimeout(() => {
        if (!this.connected) {
          this.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }

  setUniqueId() {
    if (this.connected) {
      this.socket.emit('setUniqueId', this.uniqueId, this.options);
    }
  }

  reconnect() {
    if (!this.connected) {
      console.info('Attempting to reconnect...');
      this.connect()
        .then(() => {
          console.info('Reconnected!');
        })
        .catch((err) => {
          console.warn(`Reconnection failed: ${err}`);
        });
    }
  }

  disconnect() {
    if (this.connected) {
      console.info('Disconnecting...');
      this.socket.disconnect();
      this.uniqueId = null;
      this.options = null;
      this.connected = false;
    }
  }

  on(eventName, eventHandler) {
    if (this.connected) {
      this.socket.on(eventName, eventHandler);
    }
  }

  get isConnected() {
    return this.connected;
  }
}
