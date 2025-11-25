/* Game logic extracted from index.html */
(function(){
	// --- Config ---
	const REELS = 5;
	const ROWS = 5;  // Увеличиваем до 5 рядов
	const SYMBOL_H = 68; // px
	// Game symbols array
	const SYMBOLS = ['🔱', '⚡', '🪙', '🌿', '🏆', '🦅', '🏛️', '⚔️', '🛡️', '🏹', '⭐', '🔥'];
	// Special symbols
	const TRIDENT_IMG = '🔱'; // Временный символ, будет заменен на картинку
	const WILD = '⭐';
	const SCATTER = '🔥';
	const BONUS_SYMBOL = '🎁';
  
	// Symbol properties for reference
	const SYMBOL_PROPERTIES = {
		'🔱': { name: 'Trident', multiplier: 10, weight: 10 },
		'⚡': { name: 'Lightning', multiplier: 6, weight: 15 },
		'🪙': { name: 'Coin', multiplier: 4, weight: 20 },
		'🌿': { name: 'Laurel', multiplier: 3, weight: 25 },
		'🏆': { name: 'Trophy', multiplier: 5, weight: 15 },
		'🦅': { name: 'Eagle', multiplier: 3, weight: 20 },
		'🏛️': { name: 'Temple', multiplier: 8, weight: 12 },
		'⚔️': { name: 'Sword', multiplier: 4, weight: 18 },
		'🛡️': { name: 'Shield', multiplier: 3, weight: 22 },
		'🏹': { name: 'Bow', multiplier: 4, weight: 18 },
		[WILD]: { name: 'Wild', multiplier: 0, weight: 5, isWild: true },
		[SCATTER]: { name: 'Scatter', multiplier: 0, weight: 2, isScatter: true }
	};
  
	// Game modes
	const MODES = {
		ZEUS: { name: 'Light', volatility: 'high', wildMultiplier: 2, scatterWeight: 3 },
		HADES: { name: 'Dark', volatility: 'very high', wildMultiplier: 3, scatterWeight: 5 }
	};

	// Paytable multipliers per symbol (times bet for 3..5 in a line)
	const PAY = {
		'🔱': {3:6,4:8,5:15},
		'⚡': {3:4,4:5,5:8},
		'🪙': {3:3,4:4,5:6},
		'🌿': {3:2,4:2.5,5:4},
		'🏆': {3:3,4:4,5:7},
		'🦅': {3:2,4:2.5,5:4},
		'🏛️': {3:6,4:8,5:12},
		'⚔️': {3:3,4:4,5:6},
		'🛡️': {3:2,4:2.5,5:4},
		'🏹': {3:3,4:4,5:6},
	};
	const SCATTER_PAYOUT = {3:5,4:10,5:25};

	// Paylines (row indices 0..4) — 25 lines for 5x5 grid
	const PAYLINES = [
		[0, 0, 0, 0, 0],
		[1, 1, 1, 1, 1],
		[2, 2, 2, 2, 2],
		[3, 3, 3, 3, 3],
		[4, 4, 4, 4, 4],
		[0, 1, 2, 3, 4],
		[4, 3, 2, 1, 0],
		[0, 0, 1, 1, 2],
		[1, 1, 2, 2, 3],
		[2, 2, 3, 3, 4],
		[3, 3, 4, 4, 0],
		[4, 4, 0, 0, 1],
		[0, 1, 2, 1, 0],
		[4, 3, 2, 3, 4],
		[1, 2, 3, 2, 1],
		[2, 1, 0, 1, 2],
		[3, 2, 1, 2, 3],
		[0, 1, 0, 1, 0],
		[1, 2, 1, 2, 1],
		[2, 3, 2, 3, 2],
		[3, 4, 3, 4, 3],
		[4, 3, 4, 3, 4],
		[0, 2, 4, 2, 0],
		[4, 2, 0, 2, 4],
		[1, 3, 1, 3, 1],
		[2, 0, 2, 4, 2],
	];

	// UI elements
	const reelsContainer = document.getElementById('reels');
	const reelsEls = Array.from(document.querySelectorAll('.reel'));
	const balanceEl = document.getElementById('balance');
	const betInput = document.getElementById('bet');
	const spinBtn = document.getElementById('spin');
	const autoBtn = document.getElementById('auto');
	const incBtn = document.getElementById('inc');
	const decBtn = document.getElementById('dec');
	const messageEl = document.getElementById('message');
	const winBanner = document.getElementById('win-banner');
	const winSum = document.getElementById('win-sum');
	const lastWinEl = document.getElementById('last-win');
	const totalSpinsEl = document.getElementById('total-spins');
	const totalWonEl = document.getElementById('total-won');
	const historyEl = document.getElementById('history');
	const exportBtn = document.getElementById('export-json');
	const resetBtn = document.getElementById('reset');
	const muteBtn = document.getElementById('mute');
	const musicToggleBtn = document.getElementById('music-toggle');
	const musicVolumeSlider = document.getElementById('music-volume');
	const volSelect = document.getElementById('vol');

	// Background music elements
	const backgroundMusic = document.getElementById('background-music');
	let musicPlaying = false;
	let musicVolume = 0.3; // Default volume for background music

	// Confetti canvas
	const confettiCanvas = document.getElementById('confetti-canvas');
	const confettiCtx = confettiCanvas.getContext('2d');
	let confettiParticles = [];

	// Audio (basic synth)
	const AudioCtx = window.AudioContext || window.webkitAudioContext;
	let audioCtx = null;
	let muted = false;
	const ensureAudio = ()=>{ if(!audioCtx && AudioCtx) audioCtx = new AudioCtx(); };

	function playTone(freq=440,duration=0.12,type='sine',gain=0.12){
		if(muted) return;
		try{
			ensureAudio();
			const osc = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			osc.connect(g);
			g.connect(audioCtx.destination);
			osc.frequency.value=freq;
			osc.type=type;
			g.gain.setValueAtTime(gain,audioCtx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+duration);
			osc.start(audioCtx.currentTime);
			osc.stop(audioCtx.currentTime+duration);
		}catch(e){
			// Fallback: silent
		}
	}

	// Balanced speed sound effects
	function playSpinSound(phase) {
		if(muted) return;
    
		switch(phase) {
			case 'start':
				playTone(240, 0.05, 'sawtooth', 0.11);
				break;
			case 'spinning':
				playTone(170, 0.25, 'triangle', 0.055);
				break;
			case 'decelerating':
				playTone(330, 0.3, 'sine', 0.07);
				break;
			case 'stop':
				playTone(850, 0.02, 'square', 0.09);
				break;
			case 'complete':
				playTone(523, 0.06, 'sine', 0.13);
				setTimeout(() => playTone(659, 0.06, 'sine', 0.11), 80);
				break;
		}
	}

	// Background music control functions
	function toggleBackgroundMusic() {
		if (!backgroundMusic) return;
    
		if (musicPlaying) {
			backgroundMusic.pause();
			musicToggleBtn.textContent = '🎵';
			musicToggleBtn.setAttribute('aria-pressed', 'false');
			musicPlaying = false;
		} else {
			backgroundMusic.volume = musicVolume;
			backgroundMusic.play().catch(error => {
				console.log('Background music autoplay blocked:', error);
				showMessage('Нажмите кнопку 🎵 для включения музыки', 'info');
			});
			musicToggleBtn.textContent = '🔇';
			musicToggleBtn.setAttribute('aria-pressed', 'true');
			musicPlaying = true;
		}
	}

	function setMusicVolume(volume) {
		musicVolume = Math.max(0, Math.min(1, volume));
		if (backgroundMusic) {
			backgroundMusic.volume = musicVolume;
		}
		if (musicVolumeSlider) {
			musicVolumeSlider.value = musicVolume * 100;
		}
		localStorage.setItem('musicVolume', musicVolume.toString());
	}

	function initBackgroundMusic() {
		if (backgroundMusic) {
			const savedVolume = localStorage.getItem('musicVolume');
			if (savedVolume) {
				musicVolume = parseFloat(savedVolume);
				musicVolumeSlider.value = musicVolume * 100;
			}
      
			backgroundMusic.volume = musicVolume;
      
			backgroundMusic.play().then(() => {
				musicPlaying = true;
				musicToggleBtn.textContent = '🔇';
				musicToggleBtn.setAttribute('aria-pressed', 'true');
			}).catch(error => {
				console.log('Background music autoplay blocked:', error);
				musicPlaying = false;
				musicToggleBtn.textContent = '🎵';
				musicToggleBtn.setAttribute('aria-pressed', 'false');
			});
		}
	}

	function randInt(n){
		const a = new Uint32Array(1);
		crypto.getRandomValues(a);
		return a[0] % n;
	}

	// --- State ---
	const MIN_BET = 10;
	const MAX_BET = 10000;
	document.getElementById('min-bet').textContent = MIN_BET;
	document.getElementById('max-bet').textContent = MAX_BET;

	let state = {
		balance: 1000,
		bet: 10,
		totalSpins: 0,
		totalWon: 0,
		totalBet: 0,
		history: [],
		bonusSpins: 0,
		inBonusMode: false,
		bonusTriggered: false,
		bonusBuyPrice: 0,
		lastWin: 0,
		autoSpins: 0,
		autoSpinning: false,
		winStreak: 0,
		lastBonusTime: 0,
		mode: 'ZEUS',
		currentMode: MODES.ZEUS,
		freeSpinsWon: 0,
		totalFreeSpins: 0,
		wildMultiplier: 1,
		scatterCount: 0,
		bonusRoundCount: 0,
		maxWin: 15000,
		expandedWilds: [],
		bonusWildMultipliers: {},
		totalBonusWins: 0,
		bonusRoundActive: false,
		maxWinAmount: 0,
		bigWins: 0,
		megaWins: 0,
		superWins: 0
	};

	// init UI
	function refreshUI(){
		balanceEl.textContent = Math.floor(state.balance);
		totalSpinsEl.textContent = state.totalSpins;
		totalWonEl.textContent = state.totalWon;
    
		const totalBetEl = document.getElementById('total-bet');
		const totalWonMainEl = document.getElementById('total-won');
		const totalProfitEl = document.getElementById('total-profit');
    
		if (totalBetEl) totalBetEl.textContent = `${state.totalBet} ₽`;
		if (totalWonMainEl) totalWonMainEl.textContent = `${state.totalWon} ₽`;
		if (totalProfitEl) {
			const profit = state.totalWon - state.totalBet;
			totalProfitEl.textContent = `${profit} ₽`;
			totalProfitEl.style.color = profit >= 0 ? '#8ef58e' : '#ff6b6b';
		}
    
		const bonusSpinsEl = document.getElementById('bonus-spins');
		const buyBonusBtn = document.getElementById('buy-bonus');
		const currentBet = Number(betInput.value);
		const bonusCost = currentBet * 100;
    
		if (bonusSpinsEl) bonusSpinsEl.textContent = state.bonusSpins;
		if (buyBonusBtn) {
			buyBonusBtn.textContent = `Buy Bonus (${bonusCost}₽)`;
			buyBonusBtn.disabled = state.balance < bonusCost || state.inBonusMode;
		}
    
		const spinText = document.getElementById('spin-text');
		if (spinText) {
			spinText.textContent = state.inBonusMode ? `SPIN (${state.bonusSpins} left)` : 'SPIN';
		}
    
		localStorage.setItem('bonusSpins', state.bonusSpins);
		localStorage.setItem('inBonusMode', state.inBonusMode);
    
		historyEl.innerHTML = '';
		if (state.history.length === 0) {
			const emptyLi = document.createElement('li');
			emptyLi.textContent = 'No spins yet';
			emptyLi.style.color = 'var(--muted)';
			emptyLi.style.fontStyle = 'italic';
			historyEl.appendChild(emptyLi);
		} else {
			state.history.slice().reverse().forEach((h, index) => {
				const li = document.createElement('li');
				li.style.marginBottom = '4px';
				li.style.padding = '4px 8px';
				li.style.borderRadius = '4px';
				li.style.background = h.isBonus ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.02)';
				li.style.borderLeft = h.isBonus ? '3px solid #ffd36b' : '3px solid transparent';
        
				const profit = h.win - h.bet;
				const profitColor = profit > 0 ? '#8ef58e' : profit < 0 ? '#ff6b6b' : 'var(--muted)';
				const profitSymbol = profit > 0 ? '+' : '';
        
				li.innerHTML = `
					<div style="display:flex;justify-content:space-between;align-items:center">
						<span style="color:${h.isBonus ? '#ffd36b' : 'var(--muted)'}">
							${h.time} ${h.isBonus ? '🎁' : ''}
						</span>
						<span style="color:${profitColor};font-weight:600">
							${profitSymbol}${profit}₽
						</span>
					</div>
					<div style="font-size:11px;color:var(--muted);margin-top:2px">
						Bet: ${h.bet}₽ → Win: ${h.win}₽
					</div>
				`;
        
				historyEl.appendChild(li);
			});
		}
    
		const bigWinsEl = document.getElementById('big-wins');
		const megaWinsEl = document.getElementById('mega-wins');
		const superWinsEl = document.getElementById('super-wins');
    
		if (bigWinsEl) bigWinsEl.textContent = state.bigWins;
		if (megaWinsEl) megaWinsEl.textContent = state.megaWins;
		if (superWinsEl) superWinsEl.textContent = state.superWins;
	}
	refreshUI();

	// build initial strips (long enough to animate)
	function buildReels(){
		reelsEls.forEach((rEl,i)=>{
			const strip = rEl.querySelector('.strip');
			strip.style.transform = 'translateY(0px)';
			strip._offset = 0;
			strip.innerHTML = '';
      
			const repeat = 30;
      
			for(let k=0;k<repeat;k++){
				for(const s of SYMBOLS){
					const div = document.createElement('div');
					div.className = 'symbol';
          
					if (s === '🔱') {
						div.classList.add('trident-img');
					} else if (s === '🛡️') {
						div.classList.add('shield-img');
					} else if (s === '⚡') {
						div.classList.add('lightning-img');
					} else if (s === '🪙') {
						div.classList.add('coin-img');
					} else if (s === '🌿') {
						div.classList.add('laurel-img');
					} else if (s === '⭐') {
						div.classList.add('wild-img');
					} else if (s === '🔥') {
						div.classList.add('scatter-img');
					} else if (s === '🏆') {
						div.classList.add('trophy-img');
					} else if (s === '🦅') {
						div.classList.add('eagle-img');
					} else if (s === '🏛️') {
						div.classList.add('temple-img');
					} else if (s === '⚔️') {
						div.classList.add('sword-img');
					} else if (s === '🏹') {
						div.classList.add('glock-img');
					}
          
					div.textContent = s;
					div.style.height = '';
					strip.appendChild(div);
				}
			}
      
			const symbolH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-h')) || 68;
			const symbolGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-gap')) || 8;
			const symbolFull = symbolH + symbolGap;
      
			strip.style.transform = 'translateY(0px)';
			strip._offset = 0;
		});
	}
	buildReels();

	function applySymbolToElement(el, s){
		if(!el) return;
		el.className = 'symbol';
		if (s === '🔱') {
			el.classList.add('trident-img');
		} else if (s === '🛡️') {
			el.classList.add('shield-img');
		} else if (s === '⚡') {
			el.classList.add('lightning-img');
		} else if (s === '🪙') {
			el.classList.add('coin-img');
		} else if (s === '🌿') {
			el.classList.add('laurel-img');
		} else if (s === '⭐') {
			el.classList.add('wild-img');
		} else if (s === '🔥') {
			el.classList.add('scatter-img');
		} else if (s === '🏆') {
			el.classList.add('trophy-img');
		} else if (s === '🦅') {
			el.classList.add('eagle-img');
		} else if (s === '🏛️') {
			el.classList.add('temple-img');
		} else if (s === '⚔️') {
			el.classList.add('sword-img');
		} else if (s === '🏹') {
			el.classList.add('glock-img');
		}
		el.textContent = s;
		el.style.height = '';
	}

	function getVisibleSymbolElement(reelIndex, rowIndex){
		const reelEl = reelsEls[reelIndex];
		if(!reelEl) return null;
		const strip = reelEl.querySelector('.strip');
		if(!strip) return null;
		const children = Array.from(strip.children);
		if(children.length === 0) return null;

		const symbolH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-h')) || 68;
		const symbolGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-gap')) || 8;
		const symbolFull = symbolH + symbolGap;
    
		const targetOffset = rowIndex * symbolFull + (symbolFull / 2);
    
		let best = null; 
		let bestDist = Infinity;
		const stripOffset = Math.abs(strip._offset || 0);
    
		for(let i = 0; i < children.length; i++){
			const child = children[i];
			const childCenter = i * symbolFull + (symbolFull / 2);
			const adjustedCenter = childCenter - stripOffset;
			const dist = Math.abs(adjustedCenter - targetOffset);
      
			if(dist < bestDist){
				bestDist = dist;
				best = child;
			}
		}

		return best || children[0] || null;
	}

	function sampleResult(){
		const res = [];
		for(let r=0;r<REELS;r++){
			const sym = SYMBOLS[randInt(SYMBOLS.length)];
			res.push(sym);
		}
		return res;
	}

	function evaluateGrid(grid, bet){
		let win = 0;
		const winningLines = [];
    
		let scatterCount = 0;
		for(let r=0;r<REELS;r++) {
			for(let row=0;row<ROWS;row++) {
				if(grid[r][row] === SCATTER) scatterCount++;
			}
		}
    
		if(scatterCount >= 3){
			const mult = SCATTER_PAYOUT[scatterCount] || SCATTER_PAYOUT[3];
			const payout = Math.floor(bet * mult);
			win += payout;
      
			const scatterPositions = [];
			for(let r=0;r<REELS;r++) {
				for(let row=0;row<ROWS;row++) {
					if(grid[r][row] === SCATTER) {
						scatterPositions.push({reel: r, row: row});
					}
				}
			}
      
			winningLines.push({
				type: 'scatter',
				count: scatterCount,
				payout: payout,
				positions: scatterPositions
			});
		}

		for(let pi=0; pi<PAYLINES.length; pi++){
			const path = PAYLINES[pi];
			let base = null;
			let len = 0;
			let positions = [];
			let wildCount = 0;
      
			for(let r=0; r<REELS; r++){
				const rowIdx = path[r];
				const s = grid[r][rowIdx];
        
				if(!base){
					if(s === WILD){ 
						wildCount++;
						positions.push({reel:r, row:rowIdx}); 
						continue; 
					} else if(s === SCATTER) {
						break;
					} else {
						base = s;
						len = 1 + wildCount;
						positions.push({reel:r, row:rowIdx});
					}
				} else {
					if(s === base || s === WILD){ 
						len++; 
						positions.push({reel:r, row:rowIdx}); 
						if(s === WILD) wildCount++;
					} else {
						break;
					}
				}
			}
      
			if(len >= 3 && base && base !== WILD && base !== SCATTER) {
				const payInfo = PAY[base];
				if(payInfo) {
					const mult = payInfo[len] || payInfo[3];
					if(mult) {
						const payout = Math.floor(bet * mult);
						win += payout;
						winningLines.push({
							type: 'line',
							index: pi+1,
							payout: payout,
							positions: positions,
							base: base,
							wildCount: wildCount
						});
            
						console.log(`Line ${pi+1}: ${base} x${len} = ${payout}₽ (wilds: ${wildCount})`);
					}
				}
			}
		}
    
		if(win > 0) {
			console.log(`Total win: ${win}₽ from ${winningLines.length} lines`);
		}

	return {win, winningLines};
}

function animateSpinTo(visibleGrid, duration=1200){
	return new Promise((resolve)=>{
		clearPaylineCanvas();
		let accelerated = false;
		const start = performance.now();
		const root = document.documentElement;
		const symbolH = parseFloat(getComputedStyle(root).getPropertyValue('--symbol-h')) || 68;
		const symbolGap = parseFloat(getComputedStyle(root).getPropertyValue('--symbol-gap')) || 8;
		const symbolFull = symbolH + symbolGap;

		playSpinSound('start');
    
		reelsEls.forEach((rEl,reelIdx)=>{
			const st = rEl.querySelector('.strip');
			const nodes = Array.from(st.children);
      
			const targetSymbols = visibleGrid[reelIdx];
			let foundIdx = null;
      
			for(let idx=0; idx<nodes.length-4; idx++){
				let matches = true;
				for(let row=0; row<ROWS; row++){
					if(nodes[idx + row].textContent !== targetSymbols[row]){
						matches = false;
						break;
					}
				}
				if(matches){
					foundIdx = idx;
					break;
				}
			}
      
			if(foundIdx === null) foundIdx = Math.floor(nodes.length/2);
      
			st._finalTarget = -foundIdx * symbolFull;
			st._currentPhase = 'starting';
			st.classList.remove('spinning', 'decelerating', 'stopping');
      
			setTimeout(() => {
				st.classList.add('spinning');
				st.style.transform = 'translateY(0px)';
				st._offset = 0;
				if(reelIdx === 0) playSpinSound('spinning');
			}, reelIdx * 70);
		});

		function animateStep(now){
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
      
			reelsEls.forEach((rEl,reelIdx)=>{
				const st = rEl.querySelector('.strip');
        
				if (elapsed < reelIdx * 70) return;
        
				const reelElapsed = elapsed - reelIdx * 70;
				const reelProgress = Math.min(reelElapsed / (duration - reelIdx * 70), 1);
        
				if (reelElapsed < 150 && st._currentPhase === 'starting') {
				} else if (reelElapsed >= 150 && reelElapsed < 600 && st._currentPhase === 'starting') {
					st._currentPhase = 'spinning';
				} else if (reelElapsed >= 600 && reelElapsed < 900 && st._currentPhase === 'spinning') {
					if(st._reelIdx === 0) playSpinSound('decelerating');
					st._currentPhase = 'decelerating';
					st.classList.remove('spinning');
					st.classList.add('decelerating');
				} else if (reelElapsed >= 900 && st._currentPhase === 'decelerating') {
					playSpinSound('stop');
					st._currentPhase = 'stopping';
					st.classList.remove('decelerating');
					st.style.setProperty('--target-position', `${st._finalTarget}px`);
					st.classList.add('stopping');
					const nodes = Array.from(st.children);
					const targetSymbols = visibleGrid[reelIdx];
					const bestIdx = Math.abs(Math.round(st._finalTarget / symbolFull));
					for(let row=0; row<ROWS; row++){
						const symbolEl = nodes[bestIdx + row];
						if(symbolEl){
							applySymbolToElement(symbolEl, targetSymbols[row]);
						}
					}
				}
			});

			if (!accelerated && window.__accelerateSpinRequested) {
				accelerated = true;
				reelsEls.forEach((rEl) => {
					const st = rEl.querySelector('.strip');
					try {
						if (st._currentPhase !== 'stopping') {
							st._currentPhase = 'stopping';
							st.classList.remove('spinning', 'decelerating');
							st.classList.add('stopping');
							st.style.setProperty('--target-position', `${st._finalTarget}px`);
						}
						const nodes = Array.from(st.children);
						const targetSymbols = visibleGrid[Array.prototype.indexOf.call(reelsEls, rEl)];
						const symbolH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-h')) || 68;
						const symbolGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--symbol-gap')) || 8;
						const symbolFull = symbolH + symbolGap;
						const bestIdx = Math.abs(Math.round(st._finalTarget / symbolFull));
						for(let row=0; row<ROWS; row++){
							const symbolEl = nodes[bestIdx + row];
							if(symbolEl){ applySymbolToElement(symbolEl, targetSymbols[row]); }
						}
					} catch(e){}
				});

				playSpinSound('stop');
				setTimeout(()=>{
					reelsEls.forEach((rEl)=>{
						const st = rEl.querySelector('.strip');
						try { st.classList.remove('spinning','decelerating','stopping'); } catch(e){}
						try { st.style.transform = `translateY(${st._finalTarget}px)`; st._offset = st._finalTarget; } catch(e){}
					});
					window.__accelerateSpinRequested = false;
					playSpinSound('complete');
					resolve();
				}, 80);
				return;
			}

			if (progress < 1) {
				requestAnimationFrame(animateStep);
			} else {
				playSpinSound('complete');
				setTimeout(() => {
					reelsEls.forEach((rEl) => {
						const st = rEl.querySelector('.strip');
						st.classList.remove('spinning', 'decelerating', 'stopping');
						st.style.transform = `translateY(${st._finalTarget}px)`;
						st._offset = st._finalTarget;
					});
					resolve();
				}, 150);
			}
		}

		requestAnimationFrame(animateStep);
	});
}

function generateVisibleGrid(bias='medium'){
	const volatility = {low:0.2, medium:0.35, high:0.6, 'very high':0.8}[bias] || 0.35;
	const grid = [];
	const wildMultiplier = state.currentMode?.wildMultiplier || 2;

	for(let r=0; r<REELS; r++){
		const reelCol = [];
		for(let row=0; row<ROWS; row++){
			const weights = [];
			let totalWeight = 0;
			for(const symbol of SYMBOLS) {
				const props = SYMBOL_PROPERTIES[symbol] || { weight: 10, multiplier: 1 };
				let weight = props.weight;
				if (symbol === WILD || symbol === SCATTER) {
					weight = symbol === WILD ? 3 : 1;
				} else if (props.multiplier >= 8) {
					weight = Math.max(1, Math.floor(weight * (volatility * 0.8)));
				} else if (props.multiplier <= 3) {
					weight = Math.max(5, Math.floor(weight * (1.5 - volatility)));
				}

				if (state.currentMode === MODES.HADES) {
					if (symbol === WILD) {
						weight = Math.floor(weight * 1.3);
					} else if (symbol === SCATTER) {
						weight = Math.max(1, Math.floor(weight * 0.5));
					}
				}
        
				weights.push(weight);
				totalWeight += weight;
			}
      
			let random = Math.floor(Math.random() * totalWeight);
			let selectedSymbol = SYMBOLS[0];
      
			for(let i=0; i<SYMBOLS.length; i++) {
				random -= weights[i];
				if(random < 0) {
					selectedSymbol = SYMBOLS[i];
					break;
				}
			}
      
			reelCol.push(selectedSymbol);
		}
		grid.push(reelCol);
	}
  
	console.log('Generated grid:');
	for(let r=0; r<REELS; r++) {
		console.log(`Reel ${r}: ${grid[r].join(' | ')}`);
	}
  
	return grid;
}

function launchConfetti(count=50){
		for(let i=0;i<count;i++){
			confettiParticles.push({
				x: Math.random()*confettiCanvas.width,
				y: -10 - Math.random()*200,
				size: 6 + Math.random()*10,
				velX: -2 + Math.random()*4,
				velY: 2 + Math.random()*6,
				rot: Math.random()*360,
				rotSpeed: -6 + Math.random()*12,
				color: `hsl(${Math.floor(Math.random()*60)+20},85%,55%)`
			});
		}
		if(confettiParticles.length) runConfetti();
	}

	function animateBonusActivation(isPurchase = false) {
		const reelsContainer = document.querySelector('.reels');
		const bonusText = document.createElement('div');
		bonusText.className = 'bonus-text-popup';
		bonusText.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
			pointer-events: none;
		`;
    
		const textContent = document.createElement('div');
		textContent.style.cssText = `
			font-size: 56px;
			font-weight: 900;
			color: #FFD700;
			text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
			text-align: center;
			line-height: 1.2;
			padding: 30px 50px;
			background: rgba(0, 0, 0, 0.85);
			border: 3px solid rgba(255, 215, 0, 0.7);
			border-radius: 20px;
			box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
			animation: bonusTextPopup 1.8s ease-out;
			min-width: 400px;
			max-width: 600px;
		`;
    
		if (isPurchase) {
			textContent.innerHTML = `
				🎉 БОНУС КУПЛЕН! 🎉<br>
				<span style="font-size: 36px; color: #FFA500;">10 БЕСПЛАТНЫХ СПИНОВ!</span><br>
				<span style="font-size: 24px; color: #FFFFFF;">Стоимость: ${Number(betInput.value) * 100}₽</span>
			`;
		} else {
			textContent.innerHTML = `
				⭐ БОНУСНЫЙ РАУНД! ⭐<br>
				<span style="font-size: 36px; color: #FFA500;">10 БЕСПЛАТНЫХ СПИНОВ!</span>
			`;
		}
    
		bonusText.appendChild(textContent);
		document.body.appendChild(bonusText);
    
		const overlay = document.createElement('div');
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%);
			z-index: 9999;
			pointer-events: none;
			animation: fadeInOut 2s ease-in-out;
		`;
		document.body.appendChild(overlay);
    
		if (!isPurchase) {
			reelsContainer.classList.add('bonus-activation');
		}
    
		playTone(523, 0.15, 'sine', 0.3);
		setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150);
		setTimeout(() => playTone(784, 0.15, 'sine', 0.3), 300);
		setTimeout(() => playTone(1047, 0.3, 'sine', 0.4), 450);
    
		setTimeout(() => {
			launchConfetti(isPurchase ? 120 : 80);
		}, 200);
    
		setTimeout(() => {
			bonusText.remove();
			overlay.remove();
		}, 3000);
    
		if (!isPurchase) {
			setTimeout(() => {
				reelsContainer.classList.remove('bonus-activation');
				reelsContainer.classList.add('bonus-glow');
			}, 1500);
		}
	}

	let confettiRunning = false;
	function runConfetti(){
		if(confettiRunning) return;
		confettiRunning = true;
		const ctx = confettiCtx;
		function loop(){
			ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
			for(let i=confettiParticles.length-1;i>=0;i--){
				const p = confettiParticles[i];
				p.x += p.velX; p.y += p.velY; p.velY += 0.06; p.rot += p.rotSpeed;
				ctx.save();
				ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
				ctx.restore();
				if(p.y > confettiCanvas.height + 50){ confettiParticles.splice(i,1); }
			}
			if(confettiParticles.length){
				requestAnimationFrame(loop);
			} else { confettiRunning = false; ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); }
		}
		requestAnimationFrame(loop);
	}

	let spinning = false;
	async function spinOnce(fromAuto = false) {
		if (spinning) return;
		try { window.__accelerateSpinRequested = false; } catch(e){}
		spinning = true;
		try { hideWinVisuals(); } catch (e) { }
		try { clearPaylineCanvas(); } catch(e){}
    
		const bet = Number(betInput.value);
    
		if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
			showMessage(`Ставка должна быть от ${MIN_BET} до ${MAX_BET}`, 'error');
			spinning = false;
			return;
		}
    
		const isBonusSpin = state.inBonusMode && state.bonusSpins > 0;
    
		if (!isBonusSpin) {
			if (state.balance < bet) {
				showMessage('Недостаточно средств!', 'error');
				spinning = false;
				return;
			}
			state.balance -= bet;
		} else {
			state.bonusSpins--;
			if (state.bonusSpins <= 0) {
				setTimeout(() => endBonusMode(), 2000);
			}
		}
    
		refreshUI();
    
		try {
			const bias = state.currentMode.volatility === 'very high' ? 'high' : 'medium';
			const grid = generateVisibleGrid(bias);
      
			await animateSpinTo(grid);
      
			const { win, winningLines } = evaluateGrid(grid, bet);
			let totalWin = Math.floor(win);
      
			if (state.inBonusMode) {
				for (let r = 0; r < REELS; r++) {
					for (let row = 0; row < ROWS; row++) {
						if (grid[r][row] === WILD) {
							expandWild(r, row);
							const wildKey = `${r}-${row}`;
							const multiplier = state.bonusWildMultipliers[wildKey] || 1;
							totalWin = Math.floor(totalWin * multiplier);
						}
					}
				}
			}
      
			if (totalWin > 0) {
				if (state.inBonusMode) {
					state.totalBonusWins += totalWin;
				}
        
				showWinBanner(totalWin, bet);
				highlightWinningSymbols(winningLines);
        
				if (!state.inBonusMode && !isBonusSpin && Math.random() < 0.02) {
					triggerBonus();
				}
			}
      
			const scatterCount = grid.flat().filter(s => s === SCATTER).length;
			if (scatterCount >= 3) {
				const freeSpins = scatterCount === 3 ? 3 : scatterCount === 4 ? 5 : 10;
        
				if (!state.inBonusMode) {
					animateBonusActivation(false);
					setTimeout(() => {
						startBonusMode();
						state.bonusSpins += freeSpins;
						state.totalFreeSpins += freeSpins;
						showMessage(`+${freeSpins} бесплатных спинов!`, 'success');
						refreshUI();
					}, 500);
				} else {
					state.bonusSpins += freeSpins;
					state.totalFreeSpins += freeSpins;
					showMessage(`+${freeSpins} бесплатных спинов!`, 'success');
				}
			}
      
			state.totalSpins++;
			state.lastWin = totalWin;
			state.totalWon += totalWin;
      
			if (!isBonusSpin) {
				state.totalBet += bet;
			}
      
			if (totalWin > state.maxWinAmount) {
				state.maxWinAmount = totalWin;
			}
      
			const now = new Date();
			const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
			state.history.push({
				time: timeStr,
				bet: isBonusSpin ? 0 : bet,
				win: totalWin,
				isBonus: isBonusSpin
			});
      
			if (state.history.length > 20) {
				state.history = state.history.slice(-20);
			}
      
			state.balance += totalWin;
      
			if (totalWin > 0) {
				const multiplier = Math.floor(totalWin / bet);
				let message = `Выигрыш: ${totalWin}₽ (${multiplier}×)`;
        
				if (multiplier >= 500) {
					message = '🎉 SUPER WIN! ' + message;
				} else if (multiplier >= 100) {
					message = '🎊 MEGA WIN! ' + message;
				} else if (multiplier >= 50) {
					message = '🎈 BIG WIN! ' + message;
				}
        
				showMessage(message, 'success');
			} else {
				showMessage(isBonusSpin ? 'Бонусный спин завершен' : 'Попробуйте еще раз!', 'info');
			}
      
			if (state.autoSpinning && (state.inBonusMode || state.balance >= bet)) {
				setTimeout(() => spinOnce(true), 800);
			} else if (state.autoSpinning) {
				stopAuto();
				showMessage('Автоспин остановлен: недостаточно средств', 'warning');
			}
		} catch (error) {
			console.error('Error during spin:', error);
			showMessage('Произошла ошибка во время спина', 'error');
		} finally {
			spinning = false;
			refreshUI();
		}
	}

	function triggerBonus() {
		startBonusMode();
		showMessage('🎉 СЛУЧАЙНЫЙ БОНУС! 10 бесплатных спинов!', 'success');
		playTone(880, 0.3, 'sine', 0.15);
	}

	function playBonusSound() {
		try {
			const audio = new Audio('audio/bonus.ogg');
			audio.volume = 0.7;
      
			const playPromise = audio.play();
      
			if (playPromise !== undefined) {
				playPromise.then(() => {
					console.log('Звук бонуса успешно воспроизведен');
				}).catch(error => {
					console.log('Ошибка воспроизведения звука бонуса:', error);
					document.addEventListener('click', function playSoundAfterClick() {
						audio.play().catch(e => console.log('Ошибка после клика:', e));
						document.removeEventListener('click', playSoundAfterClick);
					}, { once: true });
				});
			}
		} catch (error) {
			console.log('Ошибка создания аудио объекта:', error);
		}
	}

	function buyBonus() {
		const buyBonusBtn = document.getElementById('buy-bonus');
		const bet = Number(betInput.value);
		const cost = bet * 100;
    
		if (state.balance < cost) {
			showMessage('Недостаточно средств для покупки бонуса!', 'error');
			return;
		}
    
		// Disable button immediately to prevent multiple clicks
		if (buyBonusBtn) {
			buyBonusBtn.disabled = true;
		}
    
		state.balance -= cost;
		state.inBonusMode = true; // Set bonus mode immediately
		refreshUI();
    
		playBonusSound();
    
		animateBonusActivation(true);
    
		setTimeout(() => {
			startBonusMode();
		}, 500);
	}

	function startBonusMode() {
		state.inBonusMode = true;
		state.bonusRoundActive = true;
		state.bonusSpins = 10;
		state.expandedWilds = [];
		state.bonusWildMultipliers = {};
    
		const reelsContainer = document.querySelector('.reels');
		reelsContainer.classList.add('bonus-mode');
    
		refreshUI();
	}

	function expandWild(reelIndex, rowIndex) {
		const wildKey = `${reelIndex}-${rowIndex}`;
		if (!state.expandedWilds.includes(wildKey)) {
			state.expandedWilds.push(wildKey);
			const multiplier = Math.floor(Math.random() * 99) + 2;
			state.bonusWildMultipliers[wildKey] = multiplier;
      
			const reelEl = reelsEls[reelIndex];
			const strip = reelEl.querySelector('.strip');
			const symbolEl = getVisibleSymbolElement(reelIndex, rowIndex);
      
			if (symbolEl) {
				symbolEl.classList.add('expanded-wild');
        
				const multiplierEl = document.createElement('div');
				multiplierEl.className = 'wild-multiplier';
				multiplierEl.textContent = `${multiplier}x`;
				multiplierEl.style.position = 'absolute';
				multiplierEl.style.top = '2px';
				multiplierEl.style.right = '2px';
				multiplierEl.style.fontSize = '12px';
				multiplierEl.style.fontWeight = 'bold';
				multiplierEl.style.color = '#FFD700';
				multiplierEl.style.background = 'rgba(0,0,0,0.7)';
				multiplierEl.style.padding = '2px 4px';
				multiplierEl.style.borderRadius = '4px';
				symbolEl.appendChild(multiplierEl);
			}
      
			playTone(1000, 0.2, 'sine', 0.3);
		}
	}

	function endBonusMode() {
		if (state.bonusRoundActive) {
			state.inBonusMode = false;
			state.bonusRoundActive = false;
			state.expandedWilds = [];
			state.bonusWildMultipliers = {};
      
			const reelsContainer = document.querySelector('.reels');
			reelsContainer.classList.remove('bonus-mode', 'bonus-glow');
			try {
				reelsEls.forEach(reelEl => {
					const strip = reelEl.querySelector('.strip');
					if (!strip) return;
					Array.from(strip.children).forEach(symbolEl => {
						if (symbolEl.classList.contains('expanded-wild')) {
							symbolEl.classList.remove('expanded-wild');
							symbolEl.style.background = '';
							symbolEl.style.boxShadow = '';
							const badges = symbolEl.querySelectorAll('.wild-multiplier');
							badges.forEach(b => b.remove());
						}
					});
				});
			} catch (e) {
				console.error('Failed to clean expanded wild visuals:', e);
			}
      
			showMessage(`Бонусный раунд завершен! Общий выигрыш: ${state.totalBonusWins}₽`, 'info');
			state.totalBonusWins = 0;
			playTone(400, 0.4, 'triangle', 0.15);
			refreshUI();
		}
	}

	function showWinBanner(amount, bet = 100) {
		if (amount <= 0) return;
    
		const banner = document.getElementById('win-banner');
		const sumEl = document.getElementById('win-sum');
		const multiplier = Math.floor(amount / bet);
    
		let winLevel = '';
		let bannerColor = '';
		let confettiCount = 30;
    
		if (multiplier >= 500) {
			winLevel = 'SUPER WIN!';
			bannerColor = 'linear-gradient(180deg, #ff006e, #ff4081)';
			confettiCount = 150;
			state.superWins++;
		} else if (multiplier >= 100) {
			winLevel = 'MEGA WIN!';
			bannerColor = 'linear-gradient(180deg, #7c4dff, #b388ff)';
			confettiCount = 100;
			state.megaWins++;
		} else if (multiplier >= 50) {
			winLevel = 'BIG WIN!';
			bannerColor = 'linear-gradient(180deg, #ffd36b, #ffcc33)';
			confettiCount = 60;
			state.bigWins++;
		} else if (multiplier >= 10) {
			winLevel = 'NICE WIN!';
			bannerColor = 'linear-gradient(180deg, #8ef58e, #69f0ae)';
			confettiCount = 40;
		}
    
		banner.querySelector('div').textContent = winLevel || '🎉 ВЫ ВЫИГРАЛИ';
		sumEl.textContent = `${amount} ₽ (${multiplier}×)`;
    
		if (winLevel) {
			banner.style.background = bannerColor;
			banner.style.color = '#fff';
			banner.style.border = `6px solid ${winLevel === 'SUPER WIN!' ? '#ff006e' : winLevel === 'MEGA WIN!' ? '#7c4dff' : '#ffd36b'}`;
			sumEl.style.color = '#fff';
			sumEl.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
		} else {
			banner.style.background = 'linear-gradient(180deg,#fff7df,#fff0b8)';
			banner.style.color = '#2b1700';
			banner.style.border = '6px solid #fff';
			sumEl.style.color = '#2b1700';
			sumEl.style.textShadow = '0 6px 18px rgba(124,77,255,0.08)';
		}
    
		banner.style.display = 'block';
    
		setTimeout(() => {
			banner.style.transform = 'translate(-50%, -50%) scale(1)';
			banner.style.opacity = '1';
		}, 100);
    
		launchConfetti(confettiCount);
    
		if (winLevel === 'SUPER WIN!' || winLevel === 'MEGA WIN!') {
			playTone(523, 0.2, 'sine', 0.3);
			setTimeout(() => playTone(659, 0.2, 'sine', 0.3), 200);
			setTimeout(() => playTone(784, 0.3, 'sine', 0.4), 400);
			setTimeout(() => playTone(1047, 0.3, 'sine', 0.5), 600);
		} else {
			playTone(523, 0.15, 'sine', 0.2);
			setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 150);
			setTimeout(() => playTone(784, 0.2, 'sine', 0.3), 300);
		}
    
		setTimeout(() => {
			banner.style.transform = 'translate(-50%, -50%) scale(0.8)';
			banner.style.opacity = '0';
			setTimeout(() => {
				banner.style.display = 'none';
			}, 300);
		}, winLevel ? 4000 : 3000);
	}

	function hideWinVisuals() {
		try {
			try { cancelPaylineAnimations(); } catch(e){}

			const banner = document.getElementById('win-banner');
			if (banner) {
				banner.style.display = 'none';
				banner.style.opacity = '0';
				banner.style.transform = 'translate(-50%, -50%) scale(0.8)';
			}

			try {
				confettiParticles = [];
				if (confettiCtx && confettiCanvas) {
					confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
				}
			} catch (e) { }

			try {
				document.querySelectorAll('.symbol.win').forEach(el => {
					el.classList.remove('win');
					el.style.animation = '';
					el.style.transform = '';
					el.style.filter = '';
				});
				document.querySelectorAll('.symbol.expanded-wild').forEach(el => {
					el.classList.remove('expanded-wild');
					el.style.background = '';
					el.style.boxShadow = '';
				});
				document.querySelectorAll('.wild-multiplier').forEach(b => b.remove());
			} catch (e) { }
		} catch (e) {}
	}

	function highlightWinningSymbols(winningLines) {
		winningLines.forEach(line => {
			line.positions.forEach(pos => {
				const reelEl = reelsEls[pos.reel];
				const strip = reelEl.querySelector('.strip');
				const symbolEl = getVisibleSymbolElement(pos.reel, pos.row);
        
				if (symbolEl) {
					symbolEl.classList.add('win');
					symbolEl.style.animation = 'winGlow 900ms ease-in-out infinite';
					symbolEl.style.transform = 'scale(1.05)';
					symbolEl.style.filter = 'brightness(1.2) saturate(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)) drop-shadow(0 4px 16px rgba(255, 165, 0, 0.5))';
          
					setTimeout(() => {
						symbolEl.classList.remove('win');
						symbolEl.style.animation = '';
						symbolEl.style.transform = '';
						symbolEl.style.filter = '';
					}, 2000);
				}
			});
		});
		try {
			drawWinningLines(winningLines);
		} catch (e) {
			console.error('Failed to draw winning lines:', e);
		}
	}

	function saveState() {
		const saveData = {
			balance: state.balance,
			totalSpins: state.totalSpins,
			totalWon: state.totalWon,
			history: state.history,
			bonusSpins: state.bonusSpins,
			inBonusMode: state.inBonusMode,
			mode: state.mode,
			expandedWilds: state.expandedWilds,
			bonusWildMultipliers: state.bonusWildMultipliers
		};
		localStorage.setItem('slotGameState', JSON.stringify(saveData));
	}

	function drawWinningLines(winningLines) {
		const reelsContainer = document.getElementById('reels');
		if (!reelsContainer || !winningLines || winningLines.length === 0) return;
		setupPaylineCanvas();
		const canvas = document.getElementById('payline-canvas');
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const containerRect = reelsContainer.getBoundingClientRect();

		const lines = winningLines.map(line => {
			const pts = [];
			line.positions.forEach(pos => {
				const reelEl = reelsEls[pos.reel];
				if (!reelEl) return;
				const strip = reelEl.querySelector('.strip');
				const symbolEl = getVisibleSymbolElement(pos.reel, pos.row);
				if (!symbolEl) return;
				const r = symbolEl.getBoundingClientRect();
				const x = r.left + r.width / 2 - containerRect.left;
				const y = r.top + r.height / 2 - containerRect.top;
				pts.push({x,y});
			});
			return { meta: line, pts };
		}).filter(l => l.pts.length >= 2);

		try { cancelPaylineAnimations(); } catch(e){}

		lines.forEach((lineObj, idx) => {
			const controller = { cancelled: false };
			paylineControllers.push(controller);
			drawWinningLine(lineObj.pts, {ctx, simultaneous: true, controller});
		});
	}

	function loadState() {
		const saved = localStorage.getItem('slotGameState');
		if (saved) {
			try {
				const data = JSON.parse(saved);
				Object.assign(state, data);
				state.currentMode = MODES[state.mode] || MODES.ZEUS;
				refreshUI();
			} catch (e) {
				console.error('Failed to load saved state:', e);
			}
		}
	}

	let paylineControllers = [];

	function cancelPaylineAnimations(){
		try{
			paylineControllers.forEach(c => { try { c.cancelled = true; } catch(e){} });
		}catch(e){}
		paylineControllers = [];
		try { clearPaylineCanvas(); } catch(e){}
	}
	function setupPaylineCanvas(){
		const reelsContainer = document.getElementById('reels');
		const canvas = document.getElementById('payline-canvas');
		if (!reelsContainer || !canvas) return;
		const rect = reelsContainer.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.style.width = Math.round(rect.width) + 'px';
		canvas.style.height = Math.round(rect.height) + 'px';
		canvas.width = Math.round(rect.width * dpr);
		canvas.height = Math.round(rect.height * dpr);
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr,0,0,dpr,0,0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.clearRect(0,0,rect.width,rect.height);
	}

	function clearPaylineCanvas(){
		const canvas = document.getElementById('payline-canvas');
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr,0,0,dpr,0,0);
		ctx.clearRect(0,0,rect.width,rect.height);
	}

	function drawWinningLine(pts, opts={}){
		const canvas = document.getElementById('payline-canvas');
		if (!canvas || !pts || pts.length < 2) return Promise.resolve();
		const ctx = opts.ctx || canvas.getContext('2d');
		const controller = opts.controller || { cancelled: false };
		if (!opts.controller) paylineControllers.push(controller);
		const totalSegments = pts.length - 1;
		const segDur = opts.simultaneous ? 150 : 280;
		const totalDur = totalSegments * segDur;

		return new Promise(resolve => {
			let start = null;
			function step(ts){
				if (controller.cancelled) {
					try { ctx.clearRect(0,0,canvas.width,canvas.height); } catch(e){}
					try { paylineControllers = paylineControllers.filter(c=>c!==controller); } catch(e){}
					resolve();
					return;
				}
				if (!start) start = ts;
				const elapsed = ts - start;
				if (!opts.simultaneous) {
					clearPaylineCanvas();
				}

				ctx.save();
				try {
					const dpr = window.devicePixelRatio || 1;
					const w = canvas.width / dpr;
					const h = canvas.height / dpr;
					ctx.beginPath();
					ctx.rect(0,0,w,h);
					ctx.clip();
				} catch(e) { }

				const progress = Math.min(1, elapsed / totalDur);
				const fullSegments = Math.floor(progress * totalSegments);
				const segmentProgress = (progress * totalSegments) - fullSegments;

				ctx.lineWidth = 6;
				ctx.strokeStyle = 'rgba(255,215,80,0.98)';
				ctx.shadowBlur = 18;
				ctx.shadowColor = 'rgba(255,200,60,0.9)';

				ctx.beginPath();
				for(let i=0;i<fullSegments;i++){
					const a = pts[i];
					const b = pts[i+1];
					if(i===0){ ctx.moveTo(a.x, a.y); }
					ctx.lineTo(b.x, b.y);
				}
				if(fullSegments < totalSegments){
					const a = pts[fullSegments];
					const b = pts[fullSegments+1];
					if(fullSegments===0) ctx.moveTo(a.x,a.y);
					const cx = a.x + (b.x - a.x) * segmentProgress;
					const cy = a.y + (b.y - a.y) * segmentProgress;
					ctx.lineTo(cx, cy);
				}
				ctx.stroke();

				if(elapsed < totalDur + (opts.simultaneous ? 5000 : 200)){
					requestAnimationFrame(step);
				} else {
					if (opts.simultaneous) {
						try { paylineControllers = paylineControllers.filter(c=>c!==controller); } catch(e){}
						resolve();
					} else {
						const fadeStart = performance.now();
						const fadeDur = 600;
						function fade(now){
							if (controller.cancelled) {
								try { paylineControllers = paylineControllers.filter(c=>c!==controller); } catch(e){}
								resolve();
								return;
							}
							const t = Math.min(1, (now - fadeStart)/fadeDur);
							clearPaylineCanvas();
							ctx.lineWidth = 6;
							ctx.shadowBlur = 18*(1-t);
							ctx.shadowColor = `rgba(255,200,60,${0.9*(1-t)})`;
							ctx.beginPath();
							ctx.moveTo(pts[0].x, pts[0].y);
							for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
							ctx.strokeStyle = `rgba(255,215,80,${1-t})`;
							ctx.stroke();
							if(t<1) requestAnimationFrame(fade); else { clearPaylineCanvas(); try { paylineControllers = paylineControllers.filter(c=>c!==controller); } catch(e){}; resolve(); }
						}
						requestAnimationFrame(fade);
					}
				}
				try { ctx.restore(); } catch(e){}
			}
			requestAnimationFrame(step);
		});
	}

	function drawWinningLinesCanvas(winningLines){
		if(!winningLines || !winningLines.length) return;
		const reelsContainer = document.getElementById('reels');
		const containerRect = reelsContainer.getBoundingClientRect();
		const linesPts = winningLines.map(line => {
			const pts = [];
			line.positions.forEach(pos => {
				const reelEl = reelsEls[pos.reel];
				if (!reelEl) return;
				const strip = reelEl.querySelector('.strip');
				const symbolEl = getVisibleSymbolElement(pos.reel, pos.row);
				if (!symbolEl) return;
				const r = symbolEl.getBoundingClientRect();
				const cx = r.left + r.width/2 - containerRect.left;
				const cy = r.top + r.height/2 - containerRect.top;
				if (cx >= 0 && cy >= 0 && cx <= containerRect.width && cy <= containerRect.height) {
					pts.push({x: cx, y: cy});
				}
			});
			return pts;
		}).filter(p=>p && p.length>=2);

		(async ()=>{
			for(const pts of linesPts){
				const controller = { cancelled: false };
				paylineControllers.push(controller);
				await drawWinningLine(pts, { controller });
				if (controller.cancelled) break;
				await new Promise(r=>setTimeout(r, 180));
			}
			paylineControllers = [];
		})();
	}

	const origDrawWinningLines = window.drawWinningLines;
	function drawWinningLinesWrapper(winningLines){
		setupPaylineCanvas();
		try { cancelPaylineAnimations(); } catch(e){}
		drawWinningLinesCanvas(winningLines);
	}
	window.drawWinningLines = drawWinningLinesWrapper;
	try { drawWinningLines = drawWinningLinesWrapper; } catch(e){}

	function checkLines(grid, bet){
		const res = evaluateGrid(grid, bet || Number(betInput.value));
		return res.winningLines || [];
	}

	function highlightSymbols(line){
		if(!line || !line.positions) return;
		line.positions.forEach(pos => {
			const reelEl = reelsEls[pos.reel];
			const strip = reelEl.querySelector('.strip');
			const symbolEl = getVisibleSymbolElement(pos.reel, pos.row);
			if(symbolEl){
				symbolEl.classList.add('win');
				symbolEl.style.animation = 'winGlow 900ms ease-in-out infinite';
				symbolEl.style.transform = 'scale(1.05)';
				symbolEl.style.filter = 'brightness(1.2) saturate(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)) drop-shadow(0 4px 16px rgba(255, 165, 0, 0.5))';
				setTimeout(()=>{
					symbolEl.classList.remove('win');
					symbolEl.style.animation=''; symbolEl.style.transform=''; symbolEl.style.filter='';
				}, 2000);
			}
		});
	}

	function startAuto() {
		if (state.autoSpinning) return;
    
		const bet = Number(betInput.value);
		if (state.balance < bet && !state.inBonusMode) {
			showMessage('Недостаточно средств для автоспина!', 'error');
			return;
		}
    
		state.autoSpinning = true;
		autoBtn.textContent = 'STOP';
		autoBtn.style.background = 'linear-gradient(90deg, #ff6b6b, #ff8787)';
		showMessage('Автоспин запущен', 'info');
    
		spinOnce(true);
	}

	function stopAuto() {
		state.autoSpinning = false;
		autoBtn.textContent = 'AUTO';
		autoBtn.style.background = '';
		showMessage('Автоспин остановлен', 'info');
	}

	function showMessage(text, type = 'info') {
		messageEl.textContent = text;
		messageEl.className = 'message';
    
		if (type === 'error') {
			messageEl.style.background = 'rgba(255, 107, 107, 0.2)';
			messageEl.style.color = '#ff6b6b';
			messageEl.style.border = '1px solid rgba(255, 107, 107, 0.3)';
		} else if (type === 'success') {
			messageEl.style.background = 'rgba(142, 245, 142, 0.2)';
			messageEl.style.color = '#8ef58e';
			messageEl.style.border = '1px solid rgba(142, 245, 142, 0.3)';
		} else if (type === 'warning') {
			messageEl.style.background = 'rgba(255, 193, 7, 0.2)';
			messageEl.style.color = '#ffc107';
			messageEl.style.border = '1px solid rgba(255, 193, 7, 0.3)';
		} else {
			messageEl.style.background = 'rgba(0, 0, 0, 0.25)';
			messageEl.style.color = 'var(--muted)';
			messageEl.style.border = 'none';
		}
    
		setTimeout(() => {
			if (messageEl.textContent === text) {
				messageEl.textContent = 'Готов к следующему спину!';
				messageEl.style.background = 'rgba(0, 0, 0, 0.25)';
				messageEl.style.color = 'var(--muted)';
				messageEl.style.border = 'none';
			}
		}, 3000);
	}

	function init() {
		confettiCanvas.width = window.innerWidth;
		confettiCanvas.height = window.innerHeight;
		setupPaylineCanvas();
		window.addEventListener('resize', () => {
			confettiCanvas.width = window.innerWidth;
			confettiCanvas.height = window.innerHeight;
			setupPaylineCanvas();
		});
    
		initBackgroundMusic();
    
		loadState();
    
		spinBtn.addEventListener('click', () => {
			if (spinning) {
				try { window.__accelerateSpinRequested = true; } catch(e){}
			} else {
				spinOnce();
			}
		});
		autoBtn.addEventListener('click', () => state.autoSpinning ? stopAuto() : startAuto());
    
		const adBanner = document.querySelector('.ad-banner-side img');
		if (adBanner) {
			adBanner.addEventListener('click', () => {
				console.log('Side ad banner clicked');
			});
		}
    
		const buyBonusBtn = document.getElementById('buy-bonus');
		if (buyBonusBtn) {
			buyBonusBtn.addEventListener('click', buyBonus);
		}
    
		incBtn.addEventListener('click', () => {
			const newBet = Math.min(MAX_BET, Number(betInput.value) + 10);
			betInput.value = newBet;
			refreshUI();
		});
    
		decBtn.addEventListener('click', () => {
			const newBet = Math.max(MIN_BET, Number(betInput.value) - 10);
			betInput.value = newBet;
			refreshUI();
		});
    
		exportBtn.addEventListener('click', () => {
			const dataStr = JSON.stringify(state, null, 2);
			const dataBlob = new Blob([dataStr], {type: 'application/json'});
			const url = URL.createObjectURL(dataBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `slot-history-${new Date().toISOString().slice(0,10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			showMessage('History exported', 'success');
		});
    
		const clearHistoryBtn = document.getElementById('clear-history');
		if (clearHistoryBtn) {
			clearHistoryBtn.addEventListener('click', () => {
				if (confirm('Clear all history? This cannot be undone.')) {
					state.history = [];
					state.bigWins = 0;
					state.megaWins = 0;
					state.superWins = 0;
					state.maxWinAmount = 0;
					localStorage.setItem('history', JSON.stringify(state.history));
					localStorage.setItem('bigWins', state.bigWins);
					localStorage.setItem('megaWins', state.megaWins);
					localStorage.setItem('superWins', state.superWins);
					localStorage.setItem('maxWinAmount', state.maxWinAmount);
					refreshUI();
					showMessage('History cleared', 'info');
				}
			});
		}
    
		resetBtn.addEventListener('click', () => {
			if (confirm('Сбросить баланс и историю?')) {
				state.balance = 1000;
				state.totalSpins = 0;
				state.totalWon = 0;
				state.history = [];
				state.bonusSpins = 0;
				state.inBonusMode = false;
				state.expandedWilds = [];
				state.bonusWildMultipliers = {};
				localStorage.clear();
				refreshUI();
				showMessage('Игра сброшена', 'info');
			}
		});
    
		muteBtn.addEventListener('click', () => {
			muted = !muted;
			muteBtn.textContent = muted ? '🔇' : '🔊';
			muteBtn.setAttribute('aria-pressed', muted);
			if (!muted) {
				playTone(600, 0.1, 'sine', 0.1);
			}
		});
    
		musicToggleBtn.addEventListener('click', toggleBackgroundMusic);
    
		musicVolumeSlider.addEventListener('input', (e) => {
			const volume = e.target.value / 100;
			setMusicVolume(volume);
		});
    
		document.addEventListener('keydown', (e) => {
			if (e.code === 'Space') {
				e.preventDefault();
				if (!spinning) {
					spinOnce();
				} else {
					try { window.__accelerateSpinRequested = true; } catch(e){}
				}
			} else if (e.code === 'KeyA' && !spinning) {
				e.preventDefault();
				state.autoSpinning ? stopAuto() : startAuto();
			} else if (e.code === 'KeyB' && !spinning) {
				e.preventDefault();
				buyBonus();
			}
		});
    
		refreshUI();
		showMessage('Добро пожаловать в o block slot!', 'info');
	}

	init();
})();

