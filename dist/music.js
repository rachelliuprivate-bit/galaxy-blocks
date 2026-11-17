// 星环慢航 — original 16-bar ambient score in D, at 76 beats per minute.
// The scheduler looks ahead using the audio clock, independently of animation.
(() => {
  const button = document.getElementById('music');
  const beat = 60 / 76;
  const harmonies = [
    [50,57,61,64], [47,54,57,62], [43,50,54,59], [45,52,59,61],
    [50,57,62,66], [42,49,57,61], [43,50,57,59], [45,52,57,62],
    [47,54,62,64], [43,50,54,61], [50,57,61,66], [45,52,59,64],
    [40,47,55,62], [43,50,57,62], [45,52,59,61], [50,57,61,64]
  ];
  const phrases = [
    [69,0,73,71], [0,66,0,69], [71,0,66,0], [64,0,0,0],
    [69,73,0,78], [0,76,73,0], [71,0,69,66], [64,0,0,0],
    [74,0,78,76], [73,0,71,0], [69,0,66,69], [71,73,0,0],
    [67,0,71,74], [0,71,69,0], [64,0,69,73], [69,0,0,0]
  ];
  let enabled = read('music','on') === 'on';
  let context, bus, timer, nextTime, step = 0, activated = false;
  let generation = 0;
  function label() {
    button.textContent = enabled ? '♫ 音乐开启' : '♫ 音乐关闭';
    button.setAttribute('aria-pressed', String(enabled));
  }
  function note(midi,time,length,amplitude,attack,wave,detune=0) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(amplitude,time+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(gain).connect(bus);
    osc.onended = () => {osc.disconnect();gain.disconnect()};
    osc.start(time);osc.stop(time+length);
  }
  function schedule() {
    if (context.state !== 'running') return;
    // After a browser stall, resume the phrase without playing overdue beats together.
    nextTime = Math.max(context.currentTime+.012,nextTime);
    while (nextTime < context.currentTime+.23) {
      const bar = Math.floor(step/4), position = step%4;
      if (position===0) {
        harmonies[bar].forEach((pitch,i) => note(pitch,nextTime,beat*4.8,.019,.48,'sine',i-1));
        note(harmonies[bar][0]-12,nextTime,beat*3.7,.028,.18,'sine');
      }
      const pitch = phrases[bar][position];
      if (pitch) {
        note(pitch,nextTime,beat*2.4,.034,.024,'sine');
        note(pitch+12,nextTime+.018,beat*.8,.006,.015,'triangle');
        note(pitch,nextTime+beat*.73,beat*1.3,.007,.04,'sine');
      }
      step=(step+1)%(harmonies.length*4);
      nextTime+=beat;
    }
  }
  async function play() {
    if (!enabled || !activated || document.hidden || timer!=null) return;
    const request=++generation;
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      if(request!==generation || !enabled || document.hidden) return;
      bus=context.createGain();bus.gain.value=.55;bus.connect(context.destination);
      nextTime=context.currentTime+.04;schedule();timer=setInterval(schedule,90);
    } catch { /* The next user gesture can retry audio activation. */ }
  }
  function stop() {
    generation++;
    clearInterval(timer);timer=null;
    if(bus){
      const tail=bus;
      tail.gain.setTargetAtTime(.0001,context.currentTime,.025);
      setTimeout(()=>tail.disconnect(),160);
      bus=null;
    }
  }
  function activate(event) {
    if(button.contains(event.target))return;
    activated=true;play();
  }
  document.addEventListener('click',activate);
  document.addEventListener('keydown',activate);
  button.addEventListener('click',()=>{
    enabled=!enabled;save('music',enabled?'on':'off');label();activated=true;
    if(enabled)play();else stop();
  });
  document.addEventListener('visibilitychange',()=>document.hidden?stop():play());
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',()=>play());
  label();
})();
