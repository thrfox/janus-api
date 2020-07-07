module.exports = {
  janus: {
    // url: 'wss://janus.conf.meetecho.com/ws', // 官方demo
    // url: 'ws://janus.runjian.com:8188', // 本地janus 服务器
    url: 'wss://192.168.10.100:8189', // 用wss转发janus 服务器 ws://janus.runjian.com:8188
    // url: 'wss://192.168.10.100:9189', // 用wss转发janus 服务器 ws://janus.runjian.com:8188
    keepAliveIntervalMs: 30000,
    options: {
      rejectUnauthorized: false
    },
    filterDirectCandidates: true,
    recordDirectory: '/workspace/records/',
    bitrate: 774144,
    firSeconds: 10,
    publishers: 20
  },
  peerConnectionConfig: {
    iceServers: [
      // { url: 'stun:stun.l.google.com:19302' }
      { url: 'stun:janus.runjian.com:3478' }
    ]
  }
}
