const $ = (id) => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
const modes = { otp: $('otpMode'), password: $('passwordMode'), passkey: $('passkeyMode') };
let timerId = null;
let seconds = 30;

function setStatus(message, good = true) {
  const el = $('status');
  if (!el) return;
  el.textContent = message;
  el.style.color = good ? '#72d7a5' : '#ff8f9a';
}

function digits(value) { return String(value || '').replace(/\D/g, '').slice(0, 10); }

function switchMode(mode) {
  Object.entries(modes).forEach(([key, el]) => el?.classList.toggle('hidden', key !== mode));
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  setStatus('');
}

tabs.forEach(tab => tab.addEventListener('click', () => switchMode(tab.dataset.mode)));
$('phone')?.addEventListener('input', e => { e.target.value = digits(e.target.value); });
$('loginPhone')?.addEventListener('input', e => { e.target.value = digits(e.target.value); });

function startTimer() {
  clearInterval(timerId);
  seconds = 30;
  $('timer').textContent = '00:30';
  $('resendOtp').disabled = true;
  timerId = setInterval(() => {
    seconds -= 1;
    $('timer').textContent = `00:${String(seconds).padStart(2, '0')}`;
    if (seconds <= 0) {
      clearInterval(timerId);
      $('resendOtp').disabled = false;
      $('timer').textContent = 'Ready';
    }
  }, 1000);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

async function sendOtp() {
  const phone = $('phone').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  $('sendOtp').disabled = true;
  setStatus('Sending secure OTP…');
  try {
    const result = await postJson('/api/auth/send-otp', { phone });
    $('otpArea').classList.remove('hidden');
    startTimer();
    $('otp').focus();
    setStatus(result.message || 'OTP sent successfully. Check your phone.');
  } catch (error) {
    setStatus(error.message, false);
  } finally {
    $('sendOtp').disabled = false;
  }
}

$('sendOtp')?.addEventListener('click', sendOtp);
$('resendOtp')?.addEventListener('click', sendOtp);

$('verifyOtp')?.addEventListener('click', async () => {
  const phone = $('phone').value;
  const otp = $('otp').value.replace(/\D/g, '');
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  if (!/^\d{6}$/.test(otp)) return setStatus('Enter the 6-digit OTP.', false);
  $('verifyOtp').disabled = true;
  setStatus('Verifying OTP securely…');
  try {
    const result = await postJson('/api/auth/verify-otp', { phone, code: otp });
    setStatus(result.message || 'Phone verified successfully.');
    setTimeout(() => { window.location.href = 'novaai.html'; }, 450);
  } catch (error) {
    setStatus(error.message, false);
  } finally {
    $('verifyOtp').disabled = false;
  }
});

$('passwordLogin')?.addEventListener('click', () => {
  const phone = $('loginPhone').value;
  const password = $('password').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  if (password.length < 8) return setStatus('Password must contain at least 8 characters.', false);
  setStatus('Password authentication endpoint will be enabled after the account database is connected.');
});

$('passkeyLogin')?.addEventListener('click', async () => {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return setStatus('Passkeys are not available in this browser. Use Mobile OTP.', false);
  }
  setStatus('Passkey support detected. WebAuthn registration and server challenge verification are next.');
});

$('forgotPassword')?.addEventListener('click', () => {
  switchMode('otp');
  setStatus('Use mobile OTP to begin secure account recovery.');
});
