
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const statusEl = $('dashStatus');
  const bodyEl = $('dashBody');
  const modal = $('profileModal');

  let savedProfile = {};

  function setStatus(el, message, error = false) {
    if (!el) return;

    el.textContent = message || '';
    el.classList.toggle('is-error', Boolean(message && error));
    el.classList.toggle('is-success', Boolean(message && !error));
  }

  function clearErrors(form) {
    if (!form) return;

    form.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
    });

    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
      el.removeAttribute('aria-invalid');
    });
  }

  function applyErrors(form, errors) {
    Object.entries(errors || {}).forEach(([key, message]) => {
      const input = form.querySelector(
        `[name="${CSS.escape(key)}"]`
      );

      const errorEl = $('err_' + key);

      if (input) input.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = message;
    });
  }

  async function jsonFetch(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      throw new Error('auth');
    }

    const responseText = await res.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        'Invalid server response. Please check the PHP file.'
      );
    }

    return { res, data };
  }

  function updateProfileDetails(profile) {
    $('displayFullName').textContent =
      profile.full_name || 'Not provided';

    $('displayEmail').textContent =
      profile.email || 'Not provided';

    $('displayPhone').textContent =
      profile.phone || 'Not provided';

    $('displayAddress').textContent =
      profile.address || 'Not provided';

    $('displayDateOfBirth').textContent =
      profile.date_of_birth || 'Not provided';
  }

  function fillProfileForm(profile) {
    $('fullName').value = profile.full_name || '';
    $('email').value = profile.email || '';
    $('phone').value = profile.phone || '';
    $('address').value = profile.address || '';
    $('dateOfBirth').value = profile.date_of_birth || '';
  }

  function openModal() {
    fillProfileForm(savedProfile);

    clearErrors($('profileForm'));
    clearErrors($('passwordForm'));

    setStatus($('profileStatus'), '');
    setStatus($('passwordStatus'), '');

    $('passwordForm').reset();
    $('passwordForm').hidden = true;
    $('changePasswordBtn').style.display = '';

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    $('fullName').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';

    fillProfileForm(savedProfile);

    $('profileForm').reset();
    fillProfileForm(savedProfile);

    $('passwordForm').reset();
    $('passwordForm').hidden = true;
    $('changePasswordBtn').style.display = '';

    clearErrors($('profileForm'));
    clearErrors($('passwordForm'));

    setStatus($('profileStatus'), '');
    setStatus($('passwordStatus'), '');
  }

  async function loadProfile() {
    try {
      const { data } = await jsonFetch('php/profile_data.php');

      if (!data.success) {
        throw new Error(data.message || 'Could not load your profile.');
      }

      savedProfile = {
        full_name: data.user.full_name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        date_of_birth: data.user.date_of_birth || ''
      };

      fillProfileForm(savedProfile);
      updateProfileDetails(savedProfile);

      const photoUrl =
        data.user.photo_url || 'images/profile-default.png';

      $('profilePhoto').src = photoUrl;

      $('profilePhoto').onerror = () => {
        $('profilePhoto').src = 'images/profile-default.png';
      };

      statusEl.style.display = 'none';
      bodyEl.style.display = '';
    } catch (error) {
      if (error.message !== 'auth') {
        statusEl.textContent =
          error.message || 'Could not load your profile.';
      }
    }
  }

  // Open and close the Edit Profile modal.
  $('openEditProfile').addEventListener('click', openModal);
  $('closeEditProfile').addEventListener('click', closeModal);
  $('cancelEditProfile').addEventListener('click', closeModal);
  $('profileModalBackdrop').addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });

  // Save profile details.
  $('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = $('profileForm');
    const saveButton = $('saveProfileBtn');

    clearErrors(form);
    setStatus($('profileStatus'), '');
    saveButton.disabled = true;

    const payload = {
      full_name: $('fullName').value.trim(),
      email: $('email').value.trim(),
      phone: $('phone').value.trim(),
      address: $('address').value.trim(),
      date_of_birth: $('dateOfBirth').value
    };

    try {
      const { data } = await jsonFetch('php/profile_update.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!data.success) {
        applyErrors(form, data.errors);
        setStatus(
          $('profileStatus'),
          data.message || 'Please correct the errors.',
          true
        );
        return;
      }

      savedProfile = { ...payload };

      updateProfileDetails(savedProfile);

      setStatus(
        $('profileStatus'),
        data.message || 'Profile saved successfully.'
      );

      window.setTimeout(() => {
        closeModal();
      }, 700);
    } catch (error) {
      if (error.message !== 'auth') {
        setStatus(
          $('profileStatus'),
          error.message || 'Could not save your profile.',
          true
        );
      }
    } finally {
      saveButton.disabled = false;
    }
  });

  // Show the Change Password form.
  $('changePasswordBtn').addEventListener('click', () => {
    $('passwordForm').hidden = false;
    $('currentPassword').focus();
  });

  // Cancel password change.
  $('cancelPasswordBtn').addEventListener('click', () => {
    $('passwordForm').reset();
    $('passwordForm').hidden = true;

    clearErrors($('passwordForm'));
    setStatus($('passwordStatus'), '');

    $('changePasswordBtn').style.display = '';
  });

  // Update password through the existing PHP endpoint.
  $('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = $('passwordForm');
    const saveButton = $('savePasswordBtn');

    clearErrors(form);
    setStatus($('passwordStatus'), '');
    saveButton.disabled = true;

    const payload = {
      current_password: $('currentPassword').value,
      new_password: $('newPassword').value,
      confirm_password: $('confirmPassword').value
    };

    try {
      const { data } = await jsonFetch('php/change_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!data.success) {
        applyErrors(form, data.errors);

        setStatus(
          $('passwordStatus'),
          data.message || 'Please correct the errors.',
          true
        );
        return;
      }

      form.reset();

      setStatus(
        $('passwordStatus'),
        data.message || 'Password updated successfully.'
      );
    } catch (error) {
      if (error.message !== 'auth') {
        setStatus(
          $('passwordStatus'),
          error.message || 'Could not update your password.',
          true
        );
      }
    } finally {
      saveButton.disabled = false;
    }
  });

  // Profile photo upload.
    // Change Photo modal and upload.
  const photoModal = $('photoModal');
  const photoInput = $('photoInput');
  const profilePhoto = $('profilePhoto');
  const photoPreview = $('photoPreview');
  const photoStatus = $('photoStatus');
  const photoModalStatus = $('photoModalStatus');
  const photoFileName = $('photoFileName');
  const savePhotoBtn = $('savePhotoBtn');
  const cancelPhotoBtn = $('cancelPhotoBtn');

  let selectedPhoto = null;
  let previewObjectUrl = null;

  function clearSelectedPreview() {
    selectedPhoto = null;
    photoInput.value = '';
    savePhotoBtn.disabled = true;

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function openPhotoModal() {
    clearSelectedPreview();

    photoPreview.src = profilePhoto.src;
    photoFileName.textContent = 'Choose a photo to see its preview';

    setStatus(photoModalStatus, '');
    setStatus(photoStatus, '');

    photoModal.hidden = false;
    document.body.style.overflow = 'hidden';

    $('choosePhotoBtn').focus();
  }

  function closePhotoModal() {
    photoModal.hidden = true;
    document.body.style.overflow = '';

    clearSelectedPreview();
    photoPreview.src = profilePhoto.src;

    photoFileName.textContent = 'Choose a photo to see its preview';
    setStatus(photoModalStatus, '');

    $('changePhotoBtn').focus();
  }

  $('changePhotoBtn').addEventListener('click', openPhotoModal);

  $('choosePhotoBtn').addEventListener('click', () => {
    photoInput.click();
  });

  $('closePhotoModal').addEventListener('click', closePhotoModal);
  $('cancelPhotoBtn').addEventListener('click', closePhotoModal);
  $('photoModalBackdrop').addEventListener('click', closePhotoModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !photoModal.hidden) {
      closePhotoModal();
    }
  });

  // Preview the selected image without uploading it.
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];

    if (!file) return;

    setStatus(photoModalStatus, '');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus(
        photoModalStatus,
        'Choose a JPG, PNG, or WebP image.',
        true
      );
      clearSelectedPreview();
      photoPreview.src = profilePhoto.src;
      photoFileName.textContent = 'Choose a photo to see its preview';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus(
        photoModalStatus,
        'Photo must be smaller than 5 MB.',
        true
      );
      clearSelectedPreview();
      photoPreview.src = profilePhoto.src;
      photoFileName.textContent = 'Choose a photo to see its preview';
      return;
    }

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }

    selectedPhoto = file;
    previewObjectUrl = URL.createObjectURL(file);

    photoPreview.src = previewObjectUrl;
    photoFileName.textContent = file.name;
    savePhotoBtn.disabled = false;
  });

  // Upload only after the user clicks Save Photo.
  savePhotoBtn.addEventListener('click', async () => {
    if (!selectedPhoto) {
      setStatus(photoModalStatus, 'Please choose a photo first.', true);
      return;
    }

    const fileToUpload = selectedPhoto;
    const formData = new FormData();
    formData.append('photo', fileToUpload);

    savePhotoBtn.disabled = true;
    cancelPhotoBtn.disabled = true;
    $('choosePhotoBtn').disabled = true;

    setStatus(photoModalStatus, 'Saving your photo…');

    try {
      const res = await fetch('php/profile_photo.php', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const responseText = await res.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Upload failed. Please check the server response.');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not upload photo.');
      }

      profilePhoto.src = data.photo_url ||
        'php/profile_photo.php?view=1&v=' + Date.now();

      setStatus(photoStatus, 'Photo updated successfully.');
      setStatus(photoModalStatus, 'Photo saved successfully.');

      window.setTimeout(() => {
        closePhotoModal();
      }, 700);

    } catch (error) {
      if (error.message !== 'auth') {
        setStatus(
          photoModalStatus,
          error.message || 'Could not upload photo.',
          true
        );
      }
    } finally {
      savePhotoBtn.disabled = !selectedPhoto;
      cancelPhotoBtn.disabled = false;
      $('choosePhotoBtn').disabled = false;
    }
  });

  // Sidebar and logout.
  const sidebar = $('sidebar');
  const hamburger = $('hamburgerBtn');

  if (sidebar && hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }

  $('logoutBtn').addEventListener('click', () => {
    window.location.href = 'php/logout.php';
  });

  loadProfile();
})();
