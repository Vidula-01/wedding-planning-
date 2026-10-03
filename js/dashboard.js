/* ==========================================================
   WEDORA - Dashboard page logic
   Pulls live data from php/dashboard_data.php
   ========================================================== */

(() => {

    'use strict';


    /* ======================================================
       ELEMENTS
       ====================================================== */

    const statusEl =
        document.getElementById(
            'dashStatus'
        );


    const bodyEl =
        document.getElementById(
            'dashBody'
        );


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
       LOAD DASHBOARD
       ====================================================== */

    async function loadDashboard() {

        try {

            const res =
                await fetch(
                    'php/dashboard_data.php',
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


            /* ---------- Login ---------- */

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
                'Dashboard response:',
                data
            );


            /* ---------- Check success ---------- */

            if (!data.success) {

                if (statusEl) {

                    statusEl.textContent =
                        data.message ||
                        'Could not load your dashboard.';

                    statusEl.style.display =
                        'block';
                }

                return;
            }


            /* ---------- Render ---------- */

            render(data);


            hide(statusEl);

            show(bodyEl);

        }


        catch (error) {

            console.error(
                'Dashboard loading error:',
                error
            );


            if (statusEl) {

                statusEl.textContent =
                    'Could not reach the server. ' +
                    'Make sure Apache and MySQL are running, ' +
                    'then refresh the page.';

                statusEl.style.display =
                    'block';
            }

        }

    }


    /* ======================================================
       RENDER DASHBOARD
       ====================================================== */

    function render(data) {


        /* ==================================================
           WELCOME / COUPLE NAME
           ================================================== */

        const coupleName =
            document.getElementById(
                'coupleName'
            );


        if (coupleName) {

            coupleName.textContent =
                (
                    data.user?.couple_name ||
                    data.user?.full_name ||
                    ''
                ) +
                ' 💕';

        }


        /* ==================================================
           WEDDING DATE
           ================================================== */

        const weddingDate =
            document.getElementById(
                'weddingDate'
            );


        if (weddingDate) {

            weddingDate.textContent =
                data.wedding?.date ||
                'Not set yet';

        }


        /* ==================================================
           DAYS TO GO
           ================================================== */

        const daysToGo =
            document.getElementById(
                'daysToGo'
            );


        if (daysToGo) {

            daysToGo.textContent =
                data.wedding?.days_to_go === null ||
                data.wedding?.days_to_go === undefined
                    ? '—'
                    : data.wedding.days_to_go;

        }


        /* ==================================================
           STATS
           ================================================== */

        const s =
            data.stats || {};


        /* ---------- Tasks ---------- */

        const tasksValue =
            document.getElementById(
                'tasksValue'
            );


        if (tasksValue) {

            tasksValue.textContent =
                `${s.tasks_done || 0} / ${s.tasks_total || 0}`;

        }


        const tasksBar =
            document.getElementById(
                'tasksBar'
            );


        if (tasksBar) {

            tasksBar.style.width =
                `${s.tasks_progress || 0}%`;

        }


        const tasksPct =
            document.getElementById(
                'tasksPct'
            );


        if (tasksPct) {

            tasksPct.textContent =
                `${s.tasks_progress || 0}%`;

        }


        /* ---------- Budget ---------- */

        const budgetSpentValue =
            document.getElementById(
                'budgetSpentValue'
            );


        if (budgetSpentValue) {

            budgetSpentValue.textContent =
                s.budget_spent ||
                'Rs. 0';

        }


        const budgetBar =
            document.getElementById(
                'budgetBar'
            );


        if (budgetBar) {

            budgetBar.style.width =
                `${s.budget_pct || 0}%`;

        }


        const budgetCaption =
            document.getElementById(
                'budgetCaption'
            );


        if (budgetCaption) {

            budgetCaption.textContent =
                `${s.budget_pct || 0}% of Rs ${s.budget_total || 0}`;

        }


        const budgetPct =
            document.getElementById(
                'budgetPct'
            );


        if (budgetPct) {

            budgetPct.textContent =
                `${s.budget_pct || 0}%`;

        }


        /* ---------- Guests ---------- */

        const guestsValue =
            document.getElementById(
                'guestsValue'
            );


        if (guestsValue) {

            guestsValue.textContent =
                s.guests_confirmed || 0;

        }


        /* ---------- Vendors ---------- */

        const vendorsValue =
            document.getElementById(
                'vendorsValue'
            );


        if (vendorsValue) {

            vendorsValue.textContent =
                s.vendors_saved || 0;

        }


        /* ==================================================
           UPCOMING TASKS
           ================================================== */

        const taskList =
            document.getElementById(
                'taskList'
            );


        if (taskList) {

            const tasks =
                data.upcoming_tasks || [];


            if (tasks.length === 0) {

                taskList.innerHTML =
                    '<p class="empty-note">' +
                    "No upcoming tasks — you are all caught up!" +
                    '</p>';

            } else {

                taskList.innerHTML =
                    tasks
                        .map((t) => `

                            <div class="task-row">

                                <span class="task-dot"></span>

                                <span class="task-title">
                                    ${escapeHtml(t.title)}
                                </span>

                                <span class="task-date">
                                    ${escapeHtml(t.due_date)}
                                </span>

                            </div>

                        `)
                        .join('');

            }

        }


        /* ==================================================
           BUDGET OVERVIEW
           ================================================== */

        const bo =
            data.budget_overview || {};


        const pct =
            Math.min(
                Math.max(
                    Number(
                        bo.spent_pct || 0
                    ),
                    0
                ),
                100
            );


        const donut =
            document.getElementById(
                'donutChart'
            );


        if (donut) {

            donut.style.background =
                `conic-gradient(
                    var(--maroon)
                    0% ${pct}%,
                    #f2c9cf
                    ${pct}% 100%
                )`;

        }


        const donutSpent =
            document.getElementById(
                'donutSpent'
            );


        if (donutSpent) {

            donutSpent.textContent =
                (
                    bo.spent ||
                    'Rs. 0'
                ).replace(
                    'Rs. ',
                    ''
                );

        }


        const legendTotal =
            document.getElementById(
                'legendTotal'
            );


        if (legendTotal) {

            legendTotal.textContent =
                bo.total ||
                'Rs. 0';

        }


        const legendSpent =
            document.getElementById(
                'legendSpent'
            );


        if (legendSpent) {

            legendSpent.textContent =
                bo.spent ||
                'Rs. 0';

        }


        const legendRemaining =
            document.getElementById(
                'legendRemaining'
            );


        if (legendRemaining) {

            legendRemaining.textContent =
                bo.remaining ||
                'Rs. 0';

        }


        /* ==================================================
           UPCOMING PAYMENTS
           ================================================== */

        const paymentsList =
            document.getElementById(
                'paymentsList'
            );


        if (paymentsList) {

            const payments =
                data.upcoming_payments || [];


            if (payments.length === 0) {

                paymentsList.innerHTML =
                    '<p class="empty-note">' +
                    'No upcoming payments.' +
                    '</p>';

            } else {

                paymentsList.innerHTML =
                    payments
                        .map((p) => `

                            <div class="payment-row">

                                <span class="payment-name">
                                    ${escapeHtml(p.name)}
                                </span>

                                <span class="payment-amount">
                                    ${escapeHtml(p.amount)}
                                </span>

                                <span class="payment-date">
                                    ${escapeHtml(p.due_date)}
                                </span>

                            </div>

                        `)
                        .join('');

            }

        }

    }


    /* ======================================================
       ESCAPE HTML
       ====================================================== */

    function escapeHtml(str) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            str ?? '';


        return div.innerHTML;

    }


    /* ======================================================
       SIDEBAR / HAMBURGER
       ====================================================== */

    const sidebar =
        document.getElementById(
            'sidebar'
        );


    const hamburgerBtn =
        document.getElementById(
            'hamburgerBtn'
        );


    if (
        sidebar &&
        hamburgerBtn
    ) {

        hamburgerBtn.addEventListener(
            'click',
            () => {

                sidebar.classList.toggle(
                    'is-open'
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
   START
   ====================================================== */

loadDashboard();

/*
 * Refresh dashboard data every 5 seconds.
 * This keeps Tasks and Wedding Details updated.
 */
setInterval(() => {
    loadDashboard();
}, 5000);

})();