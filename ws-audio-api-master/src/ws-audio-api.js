//    WebSockets Audio API
//
//    Opus Quality Settings
//    =====================
//    App: 2048=voip, 2049=audio, 2051=low-delay
//    Sample Rate: 8000, 12000, 16000, 24000, or 48000
//    Frame Duration: 2.5, 5, 10, 20, 40, 60
//    Buffer Size = sample rate/6000 * 1024

//change var for  const and let

;(function (global) {
  const defaultConfig = {
    codec: {
      sampleRate: 24000,
      channels: 1,
      app: 2048,
      frameDuration: 20,
      bufferSize: 4096,
    },
    server: {
      host: window.location.hostname,
    },
  }

  let WSAudioAPI = (global.WSAudioAPI = {
    Streamer: (config, socket) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia

      this.config = config || {}
      this.config.codec = this.config.codec || defaultConfig.codec
      this.config.server = this.config.server || defaultConfig.server
      this.sampler = new Resampler(
        audioContext.sampleRate,
        this.config.codec.sampleRate,
        1,
        this.config.codec.bufferSize
      )
      this.parentSocket = socket
      this.encoder = new OpusEncoder(
        this.config.codec.sampleRate,
        this.config.codec.channels,
        this.config.codec.app,
        this.config.codec.frameDuration
      )
      const _this = this

      this._makeStream = onError => {
        navigator.getUserMedia(
          { audio: true },
          stream => {
            _this.stream = stream
            _this.audioInput = audioContext.createMediaStreamSource(stream)
            _this.gainNode = audioContext.createGain()
            _this.recorder = audioContext.createScriptProcessor(
              _this.config.codec.bufferSize,
              1,
              1
            )

            _this.recorder.onaudioprocess = e => {
              let resampled = _this.sampler.resampler(
                e.inputBuffer.getChannelData(0)
              )
              let packets = _this.encoder.encode_float(resampled)
              for (let i = 0; i < packets.length; i++) {
                if (_this.socket.readyState == 1) _this.socket.send(packets[i])
              }
            }

            _this.audioInput.connect(_this.gainNode)
            _this.gainNode.connect(_this.recorder)
            _this.recorder.connect(audioContext.destination)
          },
          onError || _this.onError
        )
      }
    },
  })

  WSAudioAPI.Streamer.prototype.start = onError => {
    let _this = this
    console.log(this.config)
    if (!this.parentSocket) {
      this.socket = new WebSocket(this.config.server.host)
    } else {
      this.socket = this.parentSocket
    }

    this.socket.binaryType = 'arraybuffer'

    if (this.socket.readyState == WebSocket.OPEN) {
      this._makeStream(onError)
    } else if (this.socket.readyState == WebSocket.CONNECTING) {
      const _onopen = this.socket.onopen

      this.socket.onopen = () => {
        if (_onopen) {
          _onopen()
        }
        _this._makeStream(onError)
      }
    } else {
      console.error('Socket is in CLOSED state')
    }

    const _onclose = this.socket.onclose

    this.socket.onclose = event => {
      if (_onclose) {
        _onclose(event)
      }
      if (_this.audioInput) {
        _this.audioInput.disconnect()
        _this.audioInput = null
      }
      if (_this.gainNode) {
        _this.gainNode.disconnect()
        _this.gainNode = null
      }
      if (_this.recorder) {
        _this.recorder.disconnect()
        _this.recorder = null
      }
      if (_this.stream) _this.stream.getTracks()[0].stop()
      console.log('Disconnected from server', event.reason)
    }
  }

  WSAudioAPI.Streamer.prototype.mute = () => {
    this.gainNode.gain.value = 0
    console.log('Mic muted')
  }

  WSAudioAPI.Streamer.prototype.unMute = () => {
    this.gainNode.gain.value = 1
    console.log('Mic unmuted')
  }

  WSAudioAPI.Streamer.prototype.onError = e => {
    let error = new Error(e.name)
    error.name = 'NavigatorUserMediaError'
    throw error
  }

  WSAudioAPI.Streamer.prototype.stop = () => {
    if (this.audioInput) {
      this.audioInput.disconnect()
      this.audioInput = null
    }
    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }
    if (this.recorder) {
      this.recorder.disconnect()
      this.recorder = null
    }
    this.stream.getTracks()[0].stop()

    if (!this.parentSocket) {
      this.socket.close()
    }
  }

  // ----------------------------------------------------------------------------------------------------------------------------------------------------------



})(window)
