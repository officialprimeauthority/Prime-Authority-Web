const modalRoot = document.createElement('div');
modalRoot.id = 'pa-modal-root';
modalRoot.className = 'pa-modal-overlay';
modalRoot.innerHTML = `
  <div class="pa-modal-card" role="dialog" aria-modal="true" aria-labelledby="paModalTitle" aria-describedby="paModalMessage">
    <button class="pa-modal-close" type="button" aria-label="Close modal">×</button>
    <div class="pa-modal-header">
      <div class="pa-modal-title-row">
        <div class="pa-modal-icon" id="paModalIcon">?</div>
        <div>
          <h2 class="pa-modal-title" id="paModalTitle">Title</h2>
          <p class="pa-modal-subtitle" id="paModalMessage">Message</p>
        </div>
      </div>
    </div>
    <div class="pa-modal-body">
      <p class="pa-modal-message" id="paModalDetail"></p>
    </div>
    <div class="pa-modal-actions" id="paModalActions"></div>
  </div>
`;

document.body.appendChild(modalRoot);

const modalCard = modalRoot.querySelector('.pa-modal-card');
const closeButton = modalRoot.querySelector('.pa-modal-close');
const titleEl = modalRoot.querySelector('#paModalTitle');
const messageEl = modalRoot.querySelector('#paModalMessage');
const detailEl = modalRoot.querySelector('#paModalDetail');
const iconEl = modalRoot.querySelector('#paModalIcon');
const actionsEl = modalRoot.querySelector('#paModalActions');

let activeResolve;
let activeReject;
let lastFocusedElement = null;

const modalConfig = {
  success: {
    icon: '✔',
    color: '#22c55e',
    buttonClass: 'primary',
  },
  error: {
    icon: '✖',
    color: '#ef4444',
    buttonClass: 'danger',
  },
  confirm: {
    icon: '⚠',
    color: '#f97316',
    buttonClass: 'danger',
  },
};

function openModal({ type, title, message, detail, confirmText, cancelText, asyncAction }) {
  if (!title || !message) {
    console.warn('Modal title and message are required');
  }

  lastFocusedElement = document.activeElement;
  const config = modalConfig[type] || modalConfig.success;

  titleEl.textContent = title;
  messageEl.textContent = message;
  detailEl.textContent = detail || '';

  iconEl.textContent = config.icon;
  iconEl.style.color = config.color;

  actionsEl.innerHTML = '';

  let modalSettled = false;

  const settleModal = (value) => {
    if (modalSettled) return;
    modalSettled = true;
    if (activeResolve) activeResolve(value);
    activeResolve = null;
    activeReject = null;
  };

  const closeModalInternal = ({ cancelled = false } = {}) => {
    modalRoot.classList.remove('open');
    document.removeEventListener('keydown', onKeyDown);
    modalRoot.removeEventListener('click', onOverlayClick);
    if (lastFocusedElement && lastFocusedElement.focus) lastFocusedElement.focus();
    if (!modalSettled) {
      if (cancelled) {
        settleModal(false);
      } else {
        settleModal(true);
      }
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModalInternal({ cancelled: true });
    }
    if (event.key === 'Tab') {
      trapFocus(event);
    }
  };

  const onOverlayClick = (event) => {
    if (event.target === modalRoot) {
      closeModalInternal({ cancelled: true });
    }
  };

  closeButton.onclick = () => closeModalInternal({ cancelled: true });

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = `pa-modal-button ${config.buttonClass}`;
  confirmButton.textContent = confirmText || 'OK';
  confirmButton.addEventListener('click', async () => {
    if (asyncAction) {
      confirmButton.disabled = true;
      confirmButton.innerHTML = `<span class="pa-modal-spinner"></span> ${confirmText || 'Saving...'}`;
      try {
        await asyncAction();
        closeModalInternal();
      } catch (err) {
        confirmButton.disabled = false;
        confirmButton.textContent = confirmText || 'OK';
        settleModal(false);
        if (activeReject) activeReject(err);
      }
      return;
    }

    closeModalInternal();
  });

  actionsEl.appendChild(confirmButton);

  if (type === 'confirm') {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'pa-modal-button secondary';
    cancelButton.textContent = cancelText || 'Cancel';
    cancelButton.addEventListener('click', () => {
      closeModalInternal({ cancelled: true });
    });
    actionsEl.appendChild(cancelButton);
  }

  modalRoot.classList.add('open');
  document.addEventListener('keydown', onKeyDown);
  modalRoot.addEventListener('click', onOverlayClick);

  setTimeout(() => {
    const buttons = actionsEl.querySelectorAll('button');
    if (buttons.length) buttons[0].focus();
  }, 10);

  return new Promise((resolve, reject) => {
    activeResolve = resolve;
    activeReject = reject;
  });
}

function trapFocus(event) {
  const focusableSelectors = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';
  const focusableElements = Array.from(modalRoot.querySelectorAll(focusableSelectors)).filter((el) => !el.hasAttribute('disabled'));
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) return;

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function showSuccessModal(title, message, detail) {
  return openModal({ type: 'success', title, message, detail, confirmText: 'OK' });
}

function showErrorModal(title, message, detail) {
  return openModal({ type: 'error', title, message, detail, confirmText: 'OK' });
}

function showConfirmModal(options) {
  const { title, message, confirmText, cancelText, detail } = options;
  return openModal({
    type: 'confirm',
    title,
    message,
    detail,
    confirmText: confirmText || 'Confirm',
    cancelText: cancelText || 'Cancel',
  });
}

window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;
window.showConfirmModal = showConfirmModal;
