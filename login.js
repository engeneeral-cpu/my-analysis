const $ = (id) => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
const modes = { otp: $('otpMode'), password: $('passwordMode'), passkey: $('passkeyMode') };
let timerId = null;
let seconds = 30;

function setStatus(message, good = true) {
  const el = $('status');
  el.textContent = message;
  el.style.color = good ? '#72d7a5' : '#ff8f9a';
}

function digits(value) { return value.replace(/\D/g, '').slice(0, 10); }

function switchMode(mode) {
  Object.entries(modes).forEach(([key, el]) => el.classList.toggle('hidden', key !== mode));
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  setStatus('');
}

tabs.forEach(tab => tab.addEventListener('click', () => switchMode(tab.dataset.mode)));
$('phone').addEventListener('input', e => { e.target.value = digits(e.target.value); });
$('loginPhone').addEventListener('input', e => { e.target.value = digits(e.target.value); });

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

$('sendOtp').addEventListener('click', () => {
  const phone = $('phone').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  $('otpArea').classList.remove('hidden');
  startTimer();
  $('otp').focus();
  setStatus('OTP request prepared. Connect your server-side OTP provider to send the real code.');
});

$('resendOtp').addEventListener('click', () => {
  startTimer();
  setStatus('OTP resend request prepared.');
});

$('verifyOtp').addEventListener('click', () => {
  const otp = $('otp').value.replace(/\D/g, '');
  if (!/^\d{6}$/.test(otp)) return setStatus('Enter the 6-digit OTP.', false);
  setStatus('OTP format verified. Server-side OTP verification is required before creating a session.');
});

$('passwordLogin').addEventListener('click', () => {
  const phone = $('loginPhone').value;
  const password = $('password').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  if (password.length < 8) return setStatus('Password must contain at least 8 characters.', false);
  setStatus('Credentials validated locally. Never send or store passwords in this frontend; connect secure server authentication.');
});

$('forgotPassword').addEventListener('click', () => {
  switchMode('otp');
  setStatus('Use mobile OTP to begin secure account recovery.');
});

$('passkeyLogin').addEventListener('click', async () => {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return setStatus('Passkeys are not available in this browser. Use Mobile OTP or Password.', false);
  }
  setStatus('Passkey support detected. Server-generated WebAuthn challenge and verification are required next.');
});
