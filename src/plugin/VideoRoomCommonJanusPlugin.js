const JanusPlugin = require('../JanusPlugin')

class VideoRoomCommonJanusPlugin extends JanusPlugin {
  constructor (logger) {
    super(logger)
    this.pluginName = 'janus.plugin.videoroom'
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

  listParticipants (janusRoomId) {
    const listparticipants = {
      request: 'listparticipants',
      room: janusRoomId
    }

    return this.transaction('message', { body: listparticipants }, 'success').then(param => {
      const { data } = param || {}
      return data.participants || []
    })
  }
}

module.exports = VideoRoomCommonJanusPlugin
