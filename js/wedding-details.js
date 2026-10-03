/* ==========================================================
   WEDORA - Wedding Details Page
   ========================================================== */

(() => {
    'use strict';


    /* ======================================================
       ELEMENTS
       ====================================================== */

    const statusEl =
        document.getElementById('dashStatus');

    const bodyEl =
        document.getElementById('dashBody');

    const form =
        document.getElementById('weddingDetailsForm');

    const saveBtn =
        document.getElementById('saveWeddingDetailsBtn');

    const statusMsg =
        document.getElementById('weddingDetailsStatus');


    /* ======================================================
       SHOW / HIDE
       ====================================================== */

    function show(el) {

        if (el) {
            el.style.display = '';
        }

    }


    function hide(el) {

        if (el) {
            el.style.display = 'none';
        }

    }


    /* ======================================================
       LOAD WEDDING DETAILS
       ====================================================== */

    async function loadWeddingDetails() {

        try {

            const res = await fetch(
                'php/wedding_details_data.php',
                {
                    method: 'GET',

                    headers: {
                        'Accept':
                            'application/json'
                    },

                    credentials:
                        'same-origin'
                }
            );


            /* ---------- Login check ---------- */

            if (res.status === 401) {

                window.location.href =
                    'login.html';

                return;
            }


            /* ---------- Server error ---------- */

            if (!res.ok) {

                throw new Error(
                    'Server response: ' +
                    res.status
                );
            }


            /* ---------- Read JSON ---------- */

            const data =
                await res.json();


            console.log(
                'Wedding details response:',
                data
            );


            /* ---------- Check response ---------- */

            if (!data.success) {

                if (statusEl) {

                    statusEl.textContent =
                        data.message ||
                        'Could not load wedding details.';

                    statusEl.style.display =
                        'block';
                }

                return;
            }


            /* ---------- Fill form ---------- */

            fillForm(data);


            /* ---------- Hide loading ---------- */

            hide(statusEl);


            /* ---------- Show form ---------- */

            show(bodyEl);

        }

        catch (error) {

            console.error(
                'Wedding details loading error:',
                error
            );


            if (statusEl) {

                statusEl.textContent =
                    'Error: ' +
                    (
                        error.message ||
                        'Could not load wedding details.'
                    );

                statusEl.style.display =
                    'block';
            }

        }

    }


    /* ======================================================
       FILL FORM
       ====================================================== */

    function fillForm(data) {

        const w =
            data.wedding || {};


        /* ---------- Bride ---------- */

        const brideInput =
            document.getElementById(
                'brideName'
            );


        /* ---------- Groom ---------- */

        const groomInput =
            document.getElementById(
                'partnerName'
            );


        /* ---------- Wedding Date ---------- */

        const dateInput =
            document.getElementById(
                'weddingDate'
            );


        /* ---------- Wedding Venue ---------- */

        const venueInput =
            document.getElementById(
                'ceremonyVenue'
            );


        /* ---------- Wedding Type ---------- */

        const typeInput =
            document.getElementById(
                'theme'
            );


        /* ---------- Expected Guests ---------- */

        const guestsInput =
            document.getElementById(
                'expectedGuests'
            );


        /* ---------- Estimated Budget ---------- */

        const budgetInput =
            document.getElementById(
                'estimatedBudget'
            );


        /* ---------- Theme / Notes ---------- */

        const notesInput =
            document.getElementById(
                'notes'
            );


        /* ==================================================
           SET VALUES
           ================================================== */


        /* ---------- Bride ---------- */

        if (brideInput) {

            brideInput.value =
                w.bride_name ||
                w.partner_name ||
                '';

        }


        /* ---------- Groom ---------- */

        if (groomInput) {

            groomInput.value =
                w.groom_name ||
                w.partner_name ||
                '';

        }


        /* ---------- Wedding Date ---------- */

        if (dateInput) {

            dateInput.value =
                w.wedding_date ||
                '';

        }


        /* ---------- Wedding Venue ---------- */

        if (venueInput) {

            venueInput.value =
                w.wedding_venue ||
                w.ceremony_venue ||
                '';

        }


        /* ---------- Wedding Type ---------- */

        if (typeInput) {

            typeInput.value =
                w.wedding_type ||
                w.theme ||
                '';

        }


        /* ---------- Expected Guests ---------- */

        if (guestsInput) {

            guestsInput.value =
                w.expected_guests ??
                w.guests_confirmed ??
                '';

        }


        /* ---------- Estimated Budget ---------- */

        if (budgetInput) {

            budgetInput.value =
                w.estimated_budget ??
                w.total_budget ??
                '';

        }


        /* ---------- Theme / Notes ---------- */

        if (notesInput) {

            notesInput.value =
                w.theme_notes ||
                w.notes ||
                '';

        }


        /* ==================================================
           WEDDING PHOTO
           ================================================== */

        const photo =
            document.getElementById(
                'weddingPhoto'
            );


        if (photo) {

            photo.src =
                w.photo_path ||
                'images/wedding-default.jpg';


            photo.onerror = function () {

                this.src =
                    'images/wedding-default.jpg';

            };

        }

    }


    /* ======================================================
       CLEAR ERRORS
       ====================================================== */

    function clearErrors() {

        if (!form) {
            return;
        }


        form
            .querySelectorAll(
                '.field-error'
            )
            .forEach((el) => {

                el.textContent = '';

            });


        form
            .querySelectorAll(
                '[aria-invalid="true"]'
            )
            .forEach((el) => {

                el.removeAttribute(
                    'aria-invalid'
                );

            });

    }


    /* ======================================================
       APPLY ERRORS
       ====================================================== */

    function applyErrors(errors) {

        Object.keys(
            errors || {}
        ).forEach((key) => {


            /* ---------- Input ---------- */

            const input =
                form
                    ? form.querySelector(
                        `[name="${key}"]`
                    )
                    : null;


            /* ---------- Error message ---------- */

            const errEl =
                document.getElementById(
                    'err_' + key
                );


            /* ---------- Mark input ---------- */

            if (input) {

                input.setAttribute(
                    'aria-invalid',
                    'true'
                );

            }


            /* ---------- Show error ---------- */

            if (errEl) {

                errEl.textContent =
                    errors[key];

            }

        });

    }


    /* ======================================================
       STATUS MESSAGE
       ====================================================== */

    function setStatus(
        message,
        isError
    ) {

        if (!statusMsg) {
            return;
        }


        statusMsg.textContent =
            message || '';


        statusMsg.classList.remove(
            'is-success',
            'is-error'
        );


        if (message) {

            statusMsg.classList.add(
                isError
                    ? 'is-error'
                    : 'is-success'
            );

            statusMsg.style.display =
                'block';

        }

    }


    /* ======================================================
       GET FIELD VALUE
       ====================================================== */

    function getFieldValue(
        id,
        name
    ) {

        let element =
            document.getElementById(id);


        /* ---------- Try name ---------- */

        if (!element && name) {

            element =
                document.querySelector(
                    `[name="${name}"]`
                );

        }


        /* ---------- Field not found ---------- */

        if (!element) {

            throw new Error(
                'HTML field not found: ' +
                id
            );

        }


        return element.value.trim();

    }


    /* ======================================================
       SAVE WEDDING DETAILS
       ====================================================== */

    if (form) {

        form.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();


                console.log(
                    'SAVE BUTTON CLICKED'
                );


                clearErrors();


                setStatus(
                    '',
                    false
                );


                try {


                    /* ======================================
                       GET FORM VALUES
                       ====================================== */


                    /* ---------- Bride ---------- */

                    const brideName =
                        getFieldValue(
                            'brideName',
                            'bride_name'
                        );


                    /* ---------- Groom ---------- */

                    const groomName =
                        getFieldValue(
                            'partnerName',
                            'partner_name'
                        );


                    /* ---------- Wedding Date ---------- */

                    const weddingDate =
                        getFieldValue(
                            'weddingDate',
                            'wedding_date'
                        );


                    /* ---------- Wedding Venue ---------- */

                    const weddingVenue =
                        getFieldValue(
                            'ceremonyVenue',
                            'ceremony_venue'
                        );


                    /* ---------- Wedding Type ---------- */

                    const weddingType =
                        getFieldValue(
                            'theme',
                            'theme'
                        );


                    /* ---------- Expected Guests ---------- */

                    const expectedGuests =
                        getFieldValue(
                            'expectedGuests',
                            'expected_guests'
                        );


                    /* ---------- Estimated Budget ---------- */

                    const estimatedBudget =
                        getFieldValue(
                            'estimatedBudget',
                            'estimated_budget'
                        );


                    /* ---------- Theme / Notes ---------- */

                    const themeNotes =
                        getFieldValue(
                            'notes',
                            'notes'
                        );


                    /* ======================================
                       PAYLOAD
                       ====================================== */

                    const payload = {

                        bride_name:
                            brideName,

                        groom_name:
                            groomName,

                        wedding_date:
                            weddingDate,

                        wedding_venue:
                            weddingVenue,

                        wedding_type:
                            weddingType,

                        expected_guests:
                            expectedGuests,

                        estimated_budget:
                            estimatedBudget,

                        theme_notes:
                            themeNotes

                    };


                    console.log(
                        'Sending data:',
                        payload
                    );


                    /* ======================================
                       DISABLE SAVE BUTTON
                       ====================================== */

                    if (saveBtn) {

                        saveBtn.disabled =
                            true;

                        saveBtn.textContent =
                            'Saving...';

                    }


                    /* ======================================
                       SEND DATA TO PHP
                       ====================================== */

                    const res =
                        await fetch(
                            'php/wedding_details_update.php',
                            {

                                method:
                                    'POST',

                                headers: {

                                    'Content-Type':
                                        'application/json',

                                    'Accept':
                                        'application/json'

                                },

                                credentials:
                                    'same-origin',

                                body:
                                    JSON.stringify(
                                        payload
                                    )

                            }
                        );


                    console.log(
                        'HTTP Status:',
                        res.status
                    );


                    /* ======================================
                       READ RESPONSE SAFELY
                       ====================================== */

                    const responseText =
                        await res.text();


                    console.log(
                        'Raw PHP Response:',
                        responseText
                    );


                    let data;


                    try {

                        data =
                            JSON.parse(
                                responseText
                            );

                    }

                    catch (jsonError) {

                        console.error(
                            'Invalid JSON from PHP:',
                            responseText
                        );


                        throw new Error(
                            'Server returned invalid response. Check the PHP file.'
                        );

                    }


                    console.log(
                        'PHP Response:',
                        data
                    );


                    /* ======================================
                       LOGIN CHECK
                       ====================================== */

                    if (res.status === 401) {

                        window.location.href =
                            'login.html';

                        return;

                    }


                    /* ======================================
                       SAVE ERROR
                       ====================================== */

                    if (!data.success) {

                        applyErrors(
                            data.errors || {}
                        );


                        setStatus(
                            data.message ||
                            'Could not save wedding details.',
                            true
                        );


                        console.error(
                            'Save failed:',
                            data
                        );


                        return;

                    }


                    /* ======================================
                       SUCCESS
                       ====================================== */

                    setStatus(
                        data.message ||
                        'Wedding details saved successfully!',
                        false
                    );


                    console.log(
                        'Wedding details saved successfully!'
                    );


                    /* ======================================
                       RELOAD DATA
                       ====================================== */

                    await loadWeddingDetails();

                }


                /* ==========================================
                   SAVE ERROR / JAVASCRIPT ERROR
                   ========================================== */

                catch (error) {

                    console.error(
                        'SAVE ERROR:',
                        error
                    );


                    setStatus(
                        'Error: ' +
                        (
                            error.message ||
                            'Could not save wedding details.'
                        ),
                        true
                    );

                }


                /* ==========================================
                   ENABLE BUTTON AGAIN
                   ========================================== */

                finally {

                    if (saveBtn) {

                        saveBtn.disabled =
                            false;


                        saveBtn.innerHTML = `
                            <svg viewBox="0 0 24 24">
                                <path d="M5 3h12l3 3v15H5z"/>
                                <path d="M8 3v6h8V3"/>
                                <path d="M8 21v-7h8v7"/>
                            </svg>
                            Save Changes
                        `;

                    }

                }

            }
        );

    }


    /* ======================================================
       CHANGE PHOTO
       ====================================================== */

    const changePhotoBtn =
        document.getElementById(
            'changePhotoBtn'
        );


    const photoInput =
        document.getElementById(
            'photoInput'
        );


    const weddingPhoto =
        document.getElementById(
            'weddingPhoto'
        );


    if (
        changePhotoBtn &&
        photoInput
    ) {


        /* ---------- Open file picker ---------- */

        changePhotoBtn.addEventListener(
            'click',
            () => {

                photoInput.click();

            }
        );


        /* ---------- Select image ---------- */

        photoInput.addEventListener(
            'change',
            () => {

                const file =
                    photoInput.files[0];


                if (!file) {
                    return;
                }


                /* ---------- Check image ---------- */

                if (
                    !file.type.startsWith(
                        'image/'
                    )
                ) {

                    alert(
                        'Please select an image file.'
                    );

                    return;

                }


                /* ---------- Preview ---------- */

                const reader =
                    new FileReader();


                reader.onload =
                    (e) => {

                        if (weddingPhoto) {

                            weddingPhoto.src =
                                e.target.result;

                        }

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* ======================================================
       LOGOUT
       ====================================================== */

    const logoutBtn =
        document.getElementById(
            'logoutBtn'
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            'click',
            () => {

                window.location.href =
                    'php/logout.php';

            }
        );

    }


    /* ======================================================
       START PAGE
       ====================================================== */

    loadWeddingDetails();

})();