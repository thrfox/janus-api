
class DeivceSelectUtil {
  static listDeivce () {
    return navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioInput = devices.filter(e => e.kind === 'audioinput')
      const audioOutput = devices.filter(e => e.kind === 'audiooutput')
      const videoInput = devices.filter(e => e.kind === 'videoinput')
      return { audioInput, audioOutput, videoInput }
    })
  }

  static setDevice (peerConnection, { audioInput, audioOutput, videoInput }) {
    const constraints = {
      audio: { deviceId: audioInput ? { exact: audioInput } : 'default' },
      video: { deviceId: videoInput ? { exact: videoInput } : 'default' }
    }
    return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      const senders = peerConnection.getSenders()
      if (senders && senders.length !== 0) {
        // device has used
        senders.forEach(sender => {
          if (sender.track && sender.track.kind) {
            const kind = sender.track.kind
            if (kind === 'audio' && stream.getAudioTracks()[0]) {
              sender.replaceTrack(stream.getAudioTracks()[0])
            } else if (kind === 'video' && stream.getVideoTracks()[0]) {
              sender.replaceTrack(stream.getVideoTracks()[0])
            }
          }
        })
      } else {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream)
        })
      }
    })
  }
}

module.exports = DeivceSelectUtil