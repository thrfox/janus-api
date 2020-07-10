/* eslint-disable space-before-function-paren */
/* eslint-disable no-undef */
/* eslint-disable no-console */
const AudioBridgeJanusPlugin = require('../../src/plugin/AudioBridgeJanusPlugin.js')
const { JanusConfig, JanusAudioBridgeConfig } = require('../../src/Config.js')
const common = require('../common.js')
const Janus = require('../../src/Janus.js')
const janusConfig = new JanusConfig(common.janus)
const roomConfig = new JanusAudioBridgeConfig({})

const janus = new Janus(janusConfig, console)

const leaveButton = document.getElementById('leave')
const listRoomHolder = document.getElementById('listRoomHolder')
const listRoomMemberHolder = document.getElementById('listRoomMemberHolder')

let Rooms = []
let RoomsParticipants = []

janus.connect().then(() => {
  const audiobridge = new AudioBridgeJanusPlugin('display', console, false)
  return janus.addPlugin(audiobridge).then(() => {
    document.getElementById('listRoom').addEventListener('click', () => {
      audiobridge.listRooms().then(rooms => {
        console.log({ rooms })
        Rooms = rooms
        createRoomsTable(Rooms)
      })
    })

    document.addEventListener('click', event => {
      const roomId = parseInt(event.target.dataset.id)
      if (event.target && event.target.classList.contains('joinActionLink')) {
        joinRoom(roomId, audiobridge)
        leaveButton.removeAttribute('disabled')
        leaveButton.addEventListener('click', () => {
          audiobridge.leave()
        })
      } else if (event.target && event.target.classList.contains('infoActionLink')) {
        console.log('Info', event.target.dataset.id)
        audiobridge.listParticipants(roomId).then(members => {
          console.log({ members })
          RoomsParticipants = members
          createParticipantsTable(RoomsParticipants)
        })
      }
    })

    audiobridge.on('remoteMemberLeaving', leavingId => {
      RoomsParticipants = RoomsParticipants.filter(m => {
        return m.id !== leavingId
      })
      createParticipantsTable(RoomsParticipants)
    })

    audiobridge.on('memberChangeMuted', participant => {
      RoomsParticipants.map(m => {
        if (m.id === participant.id) {
          return Object.assign(m, participant)
        }
        return m
      })
      createParticipantsTable(RoomsParticipants)
    })
  })
})

function joinRoom(roomId, audiobridge) {
  navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
    console.log('getUserMedia got stream')
    audiobridge.join({ roomId }).then(members => {
      console.log(members)
      const peerConnection = new RTCPeerConnection(common.peerConnectionConfig)

      peerConnection.onicecandidate = event => {
        if (!event.candidate || !event.candidate.candidate) {
          audiobridge.candidate({ completed: true })
        } else {
          const candidate = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          }
          audiobridge.candidate(candidate)
        }
      }

      peerConnection.onaddstream = mediaStreamEvent => {
        console.log('@onaddstream', mediaStreamEvent)

        const audioElement = document.getElementById('audio')
        audioElement.srcObject = mediaStreamEvent.stream
      }

      peerConnection.addStream(stream)
      //  offerToReceiveAudio: true, offerToReceiveVideo: false
      return peerConnection.createOffer({}).then(offer => {
        console.log('got offer', offer)

        return peerConnection.setLocalDescription(offer).then(() => {
          console.log('setLocalDescription')
          const jsep = { type: offer.type, sdp: offer.sdp }
          audiobridge.configure(jsep).then(jsep => {
            console.log('ANSWER', jsep)
            peerConnection.setRemoteDescription(new RTCSessionDescription(jsep)).then(() => {
              console.log('remoteDescription set')
            })
          })
        })
      })
    })
  })
}

function createRoomsTable(rooms) {
  listRoomHolder.innerHTML = ''

  const table = document.createElement('div')
  table.classList.add('table')

  const thead = document.createElement('thead')
  table.appendChild(thead)
  const theadRow = document.createElement('tr')
  thead.appendChild(theadRow)

  const idHeadRow = document.createElement('th')
  idHeadRow.innerText = 'room'
  theadRow.appendChild(idHeadRow)

  const numParticipantsHeadRow = document.createElement('th')
  numParticipantsHeadRow.innerText = 'numberParticipants'
  theadRow.appendChild(numParticipantsHeadRow)

  const requiredPinHeadRow = document.createElement('th')
  requiredPinHeadRow.innerText = 'requiredPin'
  theadRow.appendChild(requiredPinHeadRow)

  const descriptionHeadRow = document.createElement('th')
  descriptionHeadRow.innerText = 'Description'
  theadRow.appendChild(descriptionHeadRow)

  const actionsHeadRow = document.createElement('th')
  actionsHeadRow.innerText = 'Actions'
  theadRow.appendChild(actionsHeadRow)

  const tbody = document.createElement('tbody')
  table.appendChild(tbody)

  rooms.forEach(stream => {
    const row = document.createElement('tr')

    const idCell = document.createElement('td')
    idCell.innerText = stream.room
    row.appendChild(idCell)

    const numParticipantsCell = document.createElement('td')
    numParticipantsCell.innerText = stream.num_participants
    row.appendChild(numParticipantsCell)

    const pinRequiredCell = document.createElement('td')
    pinRequiredCell.innerText = stream.pin_required
    row.appendChild(pinRequiredCell)

    const descriptionCell = document.createElement('td')
    descriptionCell.innerText = stream.description
    row.appendChild(descriptionCell)

    const actionsCell = document.createElement('td')
    const joinActionLink = document.createElement('button')
    joinActionLink.classList.add('joinActionLink', 'btn', 'btn-primary')
    joinActionLink.dataset.id = stream.room
    joinActionLink.innerText = 'Join'

    const infoActionLink = document.createElement('button')
    infoActionLink.classList.add('infoActionLink', 'btn', 'btn-primary')
    infoActionLink.dataset.id = stream.room
    infoActionLink.innerText = 'Info'

    actionsCell.appendChild(joinActionLink)
    actionsCell.appendChild(infoActionLink)
    row.appendChild(actionsCell)

    tbody.appendChild(row)
  })

  listRoomHolder.appendChild(table)
}

function createParticipantsTable(members) {
  listRoomMemberHolder.innerHTML = ''

  const table = document.createElement('div')
  table.classList.add('table')
  const thead = document.createElement('thead')
  table.appendChild(thead)
  const theadRow = document.createElement('tr')
  thead.appendChild(theadRow)

  const idHeadRow = document.createElement('th')
  idHeadRow.innerText = 'Id'
  theadRow.appendChild(idHeadRow)

  const displaysHeadRow = document.createElement('th')
  displaysHeadRow.innerText = 'display'
  theadRow.appendChild(displaysHeadRow)

  const mutedHeadRow = document.createElement('th')
  mutedHeadRow.innerText = 'muted'
  theadRow.appendChild(mutedHeadRow)

  const setupHeadRow = document.createElement('th')
  setupHeadRow.innerText = 'setup'
  theadRow.appendChild(setupHeadRow)

  const talkingHeadRow = document.createElement('th')
  talkingHeadRow.innerText = 'talking'
  theadRow.appendChild(talkingHeadRow)

  const tbody = document.createElement('tbody')
  table.appendChild(tbody)

  members.forEach(stream => {
    const row = document.createElement('tr')

    const idCell = document.createElement('td')
    idCell.innerText = stream.id
    row.appendChild(idCell)

    const displayCell = document.createElement('td')
    displayCell.innerText = stream.display
    row.appendChild(displayCell)

    const mutedCell = document.createElement('td')
    mutedCell.innerText = stream.muted
    row.appendChild(mutedCell)

    const setupCell = document.createElement('td')
    setupCell.innerText = stream.setup
    row.appendChild(setupCell)

    const talkingCell = document.createElement('td')
    talkingCell.innerText = stream.talking
    row.appendChild(talkingCell)

    // const actionsCell = document.createElement('td')
    // const joinActionLink = document.createElement('button')
    // joinActionLink.classList.add('joinActionLink', 'btn', 'btn-primary')
    // joinActionLink.dataset.id = stream.room
    // joinActionLink.innerText = 'Join'

    // const infoActionLink = document.createElement('button')
    // infoActionLink.classList.add('infoActionLink', 'btn', 'btn-primary')
    // infoActionLink.dataset.id = stream.room
    // infoActionLink.innerText = 'Info'

    // actionsCell.appendChild(joinActionLink)
    // actionsCell.appendChild(infoActionLink)
    // row.appendChild(actionsCell)

    tbody.appendChild(row)
  })

  listRoomMemberHolder.appendChild(table)
}
