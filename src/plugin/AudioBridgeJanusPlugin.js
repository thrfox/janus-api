const JanusPlugin = require('../JanusPlugin')
const SdpHelper = require('../SdpHelper')

class AudioBridgeJanusPlugin extends JanusPlugin {
  constructor (display, logger, filterDirectCandidates = false) {
    super(logger)
    this.display = display
    this.pluginName = 'janus.plugin.audiobridge'

    this.filterDirectCandidates = !!filterDirectCandidates

    this.sdpHelper = new SdpHelper(this.logger)
    this.isJoined = false
    this.janusRoomId = undefined
  }

  connect () {
    return this
    // return this.transaction('message', { body: { request: 'list' } }, 'success').then((param) => {
    //   const { data } = param || {}
    //   if (!data || !Array.isArray(data.list)) {
    //     this.logger.error('AudioBridgeJanusPlugin, could not find roomList', data)
    //     throw new Error('AudioBridgeJanusPlugin, could not find roomList')
    //   }

    //   const foundRoom = data.list.find((room) => room.room === roomId)
    //   if (foundRoom) {
    //     this.janusRoomId = foundRoom.room
    //     return this.join()
    //   } else {
    //     return this.createRoom()
    //   }
    // }).catch((err) => {
    //   this.logger.error('AudioBridgeJanusPlugin, cannot list rooms', err)
    //   throw err
    // })
  }

  join (config) {
    const { roomId, pin = '' } = config
    // TODO if joined, do change room
    if (this.isJoined) {
      const body = { request: 'changeroom', room: roomId, token: '' }
      return this.transaction('message', { body }, 'event').then((param) => {
        const { data } = param || {}
        return data.participants
      })
    }

    const body = { request: 'join', room: roomId, pin, display: this.display }
    return this.transaction('message', { body }, 'event').then((param) => {
      const { data } = param || {}
      if (!data || !data.id) {
        this.logger.error('AudioBridgeJanusPlugin, could not join room', data)
        throw new Error('AudioBridgeJanusPlugin, could not join room')
      }
      this.isJoined = true
      return data.participants
    }).catch((err) => {
      this.logger.error('AudioBridgeJanusPlugin, unknown error connecting to room', err)
      throw err
    })
  }

  leave () {
    const body = { request: 'leave' }
    return this.transaction('message', { body }, 'event').then(param => {
      this.isJoined = false
      return param
    })
  }

  createRoom () {
    const body = {
      request: 'create',
      room: this.config.id,
      description: '' + this.config.id
      // record: this.config.record,
      // record_file: this.config.recordDirectory
    }

    return this.transaction('message', { body }, 'success').then((param) => {
      const { data } = param || {}
      if (!data || !data.room) {
        this.logger.error('AudioBridgeJanusPlugin, could not create room', data)
        throw new Error('AudioBridgeJanusPlugin, could not create room')
      }

      this.janusRoomId = data.room

      return this.join()
    }).catch((err) => {
      this.logger.error('AudioBridgeJanusPlugin, cannot create room', err)
      throw err
    })
  }

  configure (offer, muted = false) {
    const body = { request: 'configure', muted }

    const jsep = offer
    if (this.filterDirectCandidates && jsep.sdp) {
      jsep.sdp = this.sdpHelper.filterDirectCandidates(jsep.sdp)
    }

    this.offerSdp = jsep.sdp

    return this.transaction('message', { body, jsep }, 'event').then((param) => {
      const { json } = param || {}
      if (!json.jsep) {
        throw new Error('cannot configure')
      }

      const jsep = json.jsep
      if (this.filterDirectCandidates && jsep.sdp) {
        jsep.sdp = this.sdpHelper.filterDirectCandidates(jsep.sdp)
      }

      this.answerSdp = jsep.sdp

      return jsep
    })
  }

  candidate (candidate) {
    if (this.filterDirectCandidates && candidate.candidate && this.sdpHelper.isDirectCandidate(candidate.candidate)) {
      return
    }

    return this.transaction('trickle', { candidate })
  }

  listRooms () {
    const listRoom = {
      request: 'list'
    }
    return this.transaction('message', { body: listRoom }, 'success').then(param => {
      const { data } = param || {}
      return data.list || []
    })
  }

  listParticipants (roomId) {
    const listparticipants = {
      request: 'listparticipants',
      room: roomId
    }

    return this.transaction('message', { body: listparticipants }, 'success').then(param => {
      const { data } = param || {}
      return data.participants || []
    })
  }

  onmessage (data, json) {
    this.logger.log('onmessage', { data, json })
    const { audiobridge } = data || {}

    if (!data || !audiobridge) {
      this.logger.error('AudioBridgeJanusPlugin got unknown message', json)
      return
    }

    if (audiobridge === 'slow_link') {
      this.logger.debug('AudioBridgeJanusPlugin got slow_link', data)
      this.slowLink()
      return
    }

    if (audiobridge === 'joined' || audiobridge === 'roomchanged') {
      this.emit('joined', data.participants)
      return
    }

    if (audiobridge === 'roomchanged') {
      this.emit('roomchanged', data.participants)
      return
    }

    if (audiobridge === 'event') {
      const { room, leaving, participants } = data

      if (leaving) {
        this.emit('remoteMemberLeaving', leaving)
      } else if (room && participants && participants.length === 1) {
        this.emit('memberChangeMuted', participants[0])
      } else {
        this.logger.error('AudioBridgeJanusPlugin got unknown event', json)
      }
      return
    }
    this.logger.error('AudioBridgeJanusPlugin unhandled message:', audiobridge, json)
  }
}

module.exports = AudioBridgeJanusPlugin
