function spotifApp() {

  return {

    tracks: [],
    search: '',
    selectedTrack: null,

    get filteredTracks() {
      const q = this.search.toLowerCase().trim();
      if (!q) return this.tracks;
      return this.tracks.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.artists.some(a => a.name.toLowerCase().includes(q)) ||
        t.album.name.toLowerCase().includes(q)
      );
    },

    openModal(track) {
  this.selectedTrack = track;
  const cb = `dz_${track.id}_${Date.now()}`;
  window[cb] = (data) => {
    this.selectedTrack = { ...this.selectedTrack, preview_url: data.preview ?? '' };
    delete window[cb];
    document.getElementById(cb)?.remove();
  };
  const s = document.createElement('script');
  s.id = cb;
  s.src = `https://api.deezer.com/track/${track.id}?output=jsonp&callback=${cb}`;
  s.onerror = () => { delete window[cb]; s.remove(); };
  document.head.appendChild(s);
},

    formatDuration(ms) {
      if (!ms) return '0:00';
      const total = Math.round(ms / 1000);
      const min = Math.floor(total / 60);
      const sec = total % 60;
      return min + ':' + String(sec).padStart(2, '0');
    },

    async init() {
      const res = await fetch('data/data.json');
      this.tracks = await res.json();

      this.$nextTick(() => {
        this.buildChartArtistes();
        this.buildChartGenres();
      });
    },
    get topAlbums() {
      const map = new Map();
      this.tracks.forEach(t => {
        const alb = t.album;
        if (!map.has(alb.id) || alb.popularity > map.get(alb.id).popularity) {
          map.set(alb.id, alb);
        }
      });
      return [...map.values()]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 12);
    },
    
    // Graphique 1 : Top 10 des artistes
    buildChartArtistes() {
      const counter = {};

      this.tracks.forEach(t => {
        t.artists?.forEach(a => {
          counter[a.name] = (counter[a.name] || 0) + 1;
        });
      });

      const sorted = Object.entries(counter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const labels = sorted.map(([name]) => name).reverse();
      const values = sorted.map(([, count]) => count).reverse();

      const ctx = document.getElementById('chartArtistes');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Nombre de morceaux',
            data: values,
            backgroundColor: '#133464',
            borderRadius: 3
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Top 10 des artistes (nombre de morceaux)'
            }
          }
        }
      });
    },

    // Graphique 2 : Distribution des genres
    buildChartGenres() {
      const counter = {};

      this.tracks.forEach(t => {
        t.artists?.forEach(a => {
          (a.genres || []).forEach(g => {
            counter[g] = (counter[g] || 0) + 1;
          });
        });
      });

      const sorted = Object.entries(counter)
        .sort((a, b) => b[1] - a[1]);

      const TOP_N = 7;
      const top = sorted.slice(0, TOP_N);

      const rest = sorted
        .slice(TOP_N)
        .reduce((acc, [, v]) => acc + v, 0);

      if (rest > 0) top.push(['Autres', rest]);

      const labels = top.map(([g]) => g);
      const values = top.map(([, v]) => v);

      const ctx = document.getElementById('chartGenres');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              '#FF2687',
              '#008cff',
              '#D8FF76',
              '#4b7d83',
              '#cc57e1',
              '#ffae36',
              '#62ffc0',
              '#133464',
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Distribution des genres musicaux'
            }
          }
        }
      });
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('spotifApp', spotifApp);
});