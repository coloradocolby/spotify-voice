import React, { Component } from 'react';
import annyang from 'annyang';
import axios from 'axios';
import './App.css';

const BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000'

class App extends Component {

  state = {
    query: "",
    artistName: "",
    songName: "",
    album_cover: "",
    audio: new Audio(),
    access_token: "",
    refresh_token: "",
    popularity: 0,
    external_link: ""
  }

  componentDidMount() {
    this.getHashParams();
    if(annyang) {
      const commands = {
        'stop': () => {
          this.stop();
          this.recognized(`Stop`);
          this.communicateAction(`You got it.`);
        },
        'play *song by *artist': (song, artist) => {
          this.playAudio(song, artist);
          this.recognized(`Play ${song} by ${artist}`);
        },
        'play song *song': (song) => {
          this.playAudio(song);
          this.recognized(`Play song ${song}`);
        },
        'play *audio': (audio) => {
          this.playAudio(audio);
          this.recognized(`Play ${audio}`);
        },

        ':nomatch': (message) => {
          this.communicateAction('Sorry, I can\'t understand this request');
        }
      };
      annyang.addCommands(commands);
      annyang.start();
    }
  }

  playAudio = (audioQuery, artistName) => {
    // NOTE audioQuery can be either a song or artist
    console.log(audioQuery);
    const query = artistName ? `track:${audioQuery} artist:${artistName}` : audioQuery
    this.setState(() => ({query}));
    if (!this.state.access_token) {
      this.getHashParams();
    }
    this.searchTracks(this.state.query);
  }

  stop = () => {
    this.state.audio.pause();
    this.setState(() => ({
      album_cover: "",
      artistName: "",
      songName: "",
      popularity: 0
    }));
  }

  searchTracks = (query) => {
    const BASE_URL = 'https://api.spotify.com/v1/search?';
    const FETCH_URL = BASE_URL + 'q=' + this.state.query + '&type=track';
    const myOptions = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.state.access_token
      },
      mode: 'cors',
      cache: 'default'
    };
    // query spotify api
    axios.get(FETCH_URL, myOptions)
      .then(response => {
        const track = response.data.tracks.items[0];
        console.log(track);
        if(track){
          if (!track.preview_url) {
              this.communicateAction(`Unfortunately that track doesn't have a preview! 😭`);
          } else {
            const sound = this.state.audio
            sound.src = track.preview_url
              this.setState(() => ({
                album_cover: track.album.images[0].url,
                artistName: track.artists[0].name,
                songName: track.name,
                popularity: track.popularity,
                audio: sound,
                external_link: track.external_urls.spotify
              }));
              this.communicateAction(`Playing ${this.state.songName} by ${this.state.artistName}`);
              this.state.audio.play()
            }
          }
          else{
            this.communicateAction(`No track found!`);
          }
      });
  }

  getHashParams = () => {
    const hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
    while (e = r.exec(q)) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    this.setState(() => ({
      access_token: hashParams.access_token,
      refresh_token: hashParams.refresh_token,
      logged_in: true
    }));
  }

  communicateAction = (text) => {
    const elem = document.getElementById('communicateAction');
    setTimeout(() => {
      elem.innerHTML = `<div class="action animated fadeInUp">${text}</div>`;
    }, 500)
  }

  recognized = (text) => {
    const elem = document.getElementById('recognized');
    elem.innerHTML = `<div class="recognized animated fadeInUp"><div>${text}</div></div>`;
  }
  
  render() {
    const progress= {
      width: `${this.state.popularity}%`
    }
    const { 
      access_token,
      album_cover,
      songName,
      artistName,
      popularity,
      external_link
    } = this.state;
    return (
      <div>
        <header>
          <h1 className="app-title">Spotify Voice</h1>
          {!access_token && (<a href={`${BASE_URL}/login`} className="btn btn-primary">Login</a>)}
          {access_token && (
            <p>Grant your browser access to the microphone, <br />
            then say something like "Play Hip Hop Hooray" <br />
            or "Play Piano Man by Billy Joel"</p>)}
        </header>
        <div className="row">
          <div className="col-sm-4">
            <img className="img-responsive" id="album-cover" src={album_cover} alt={songName}></img>
          </div>
          <div className="col-sm-4 text-center">
            {songName && (
              <div className="animated fadeInUp">
                <h3>{ artistName }</h3>
                <h4>{ songName }</h4>
              </div>
            )}
            {popularity !== 0 && (
                <div className="animated fadeInUp">
                  <h5 className="popularity">Popularity:</h5>
                  <div className="progress">
                    <div 
                      className="progress-bar progress-bar-success" 
                      role="progressbar"
                      aria-valuenow={this.state.popularity}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style={progress}
                    >
                    </div>
                  </div>
                </div>
              )}
              {songName && (
                <div className="flex-container animated fadeInUp">
                  <a className="btn btn-primary spotify-btn" href={external_link} target="_blank">open in spotify</a>
                </div>
              )}
          </div>
          <div className="col-sm-4">
            <div id="recognized"></div>
            <div id="communicateAction"></div>
          </div>
        </div>
        <footer className="footer">
          <p>Inspiration from a <a href="http://jsfiddle.net/JMPerez/p30pb38z/">fiddle</a> by <a href="https://twitter.com/jmperezperez?lang=en">JMPerez</a></p>
        </footer>
      </div>

    )
  }
}

export default App;
