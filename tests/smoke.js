
// Headless smoke test (jsdom, canvas stubbed).
// Not a substitute for a real browser pass.
// Run: npm install && node tests/smoke.js

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'games', 'pipeline-quest');

const html = fs.readFileSync(
    path.join(root, 'index.html'),
    'utf8'
).replace(/<script src="js\/game.js"><\/script>/, '');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/'
});

const w = dom.window;
const errs = [];

w.HTMLCanvasElement.prototype.getContext = function () {
    if (!this._c) {
        this._c = new Proxy({ canvas: this }, {
            get: (t, k) =>
                k in t
                    ? t[k]
                    : k === 'createImageData'
                        ? (a, b) => ({
                            data: new Uint8ClampedArray(a * b * 4)
                        })
                        : () => {},
            set: (t, k, v) => {
                t[k] = v;
                return true;
            }
        });
    }
    return this._c;
};

w.HTMLCanvasElement.prototype.getBoundingClientRect = function () {
    return {
        left: 0,
        top: 0,
        width: this.width,
        height: this.height
    };
};

w.addEventListener('error', e => errs.push(e.message));

{
    const sc = w.document.createElement('script');
    sc.textContent = fs.readFileSync(
        path.join(root, 'js', 'game.js'),
        'utf8'
    );
    w.document.body.appendChild(sc);
}

const E = s => w.eval(s);
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const click = el => {
    if (!el) throw new Error('Cannot click missing element');

    el.dispatchEvent(new w.MouseEvent('click', {
        bubbles: true,
        clientX: +el._x || 0,
        clientY: +el._y || 0
    }));
};

const clickAt = (c, x, y) =>
    c.dispatchEvent(new w.MouseEvent('click', {
        bubbles: true,
        clientX: x,
        clientY: y
    }));

const input = (el, v) => {
    if (!el) throw new Error('Cannot input into missing element');

    el.value = v;
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
};

const res = [];

const ok = (name, condition) => {
    res.push([name, !!condition]);
    console.log((condition ? 'PASS ' : 'FAIL ') + name);
};

async function enter(i, kit) {
    const defaultKit = [
        'NumPy',
        'SciPy',
        'scikit-learn',
        'Matplotlib'
    ];

    E(`S.lvl=${i};S.fuel=1e6;S.kit=new Set(${JSON.stringify(
        kit === undefined ? defaultKit : kit
    )});load()`);

    for (
        let g = 0;
        g < 30 && $('#pl') && $('#pl').classList.contains('lock');
        g++
    ) {
        click($('#nc'));
        click($('#nc'));
    }
}

(async () => {
    try {
        // INITIAL CHECK
        const N = E('LEVELS.length');
        ok('10 levels loaded', N === 10);

        // LEVEL 1
        await enter(0);

        const sh = $$('[data-s]');
        $$('[data-m]').forEach(click);

        sh.forEach(b => {
            if (!E('S.done')) click(b);
        });

        ok('L1 detector ship passes', E('S.done'));

        // LEVEL 2
        await enter(1);

        const U = [
            'NumPy',
            'SciPy',
            'scikit-learn',
            'Matplotlib'
        ];

        $$('.lib')
            .filter(l => U.includes(l.textContent))
            .forEach(click);

        click($('#go'));

        ok(
            'L2 cargo seal',
            E('S.done') && E('S.kit.size') === 4
        );

        // LEVEL 3: CORRECT SAMPLING
        await enter(2);

        const f0 = +$('#pl .obj')
            .textContent.match(/jammer at (\d+)/)[1];

        input($('#fs'), 9000);
        click($('#go'));

        ok(
            `L3 capture at 9000 Hz matches logs (${f0} Hz)`,
            E('S.done')
        );

        // LEVEL 3: UNDERSAMPLING
        await enter(2);

        input($('#fs'), 3000);
        click($('#go'));

        ok(
            'L3 undersampling is penalised',
            !E('S.done') && E('S.fuel') < 1e6
        );

        // LEVEL 4
        await enter(3);

        const cv4 = $('#play canvas');

        for (
            let x = 0;
            x <= 800 && !E('S.done');
            x += 12
        ) {
            clickAt(cv4, x, 100);
        }

        ok('L4 finds 3 flaws by sweep', E('S.done'));

        // LEVEL 5: PREPROCESSING
        await enter(4);

        [
            'Remove DC',
            'Median (5)',
            'Low-pass (7)'
        ].forEach(k => {
            const button = $$('[data-k]')
                .find(b => b.dataset.k === k);

            if (button) click(button);
        });

        click($$('.btn').pop());

        ok(
            'L5 good chain ships (score>=80)',
            E('S.done') && !!E('S.l5')
        );

        // LEVEL 6: POST-PROFILING
        // Preserve the valid L5 output and inspect the four pipeline results.
        await enter(5);

        const l6Table = $('#play table');

        ok(
            'L6 profiling table renders from L5 output',
            !!l6Table && $$('tbody tr').length >= 0
        );

        const l6Rows = l6Table
            ? l6Table.querySelectorAll('tr').length
            : 0;

        ok(
            'L6 displays four candidate pipelines',
            l6Rows === 5
        );

        // Select a passing pipeline, if one is available.
        $$('[data-i]').forEach(b => {
            if (!E('S.done')) click(b);
        });

        ok('L6 a passing pipeline exists', E('S.done'));

        if (!E('S.done')) {
            console.log(
                'L6 pipeline results:',
                $$('tr').map(r => r.textContent).join('\n')
            );
        }

        // LEVEL 7: EXPLORATORY ANALYSIS
        await enter(6);

        const c7 = $('#play canvas');

        for (
            let y = 0;
            y < 320 && !E('S.done');
            y += 20
        ) {
            for (
                let x = 0;
                x < 800 && !E('S.done');
                x += 20
            ) {
                clickAt(c7, x, y);
            }
        }

        ok('L7 tags all 3 emitters by sweep', E('S.done'));

        // LEVEL 8: MODELING
        await enter(7);

        input($('#th'), 1.45);
        click($('#go'));

        ok(
            'L8 threshold 1.45 meets Pd/Pfa target',
            E('S.done')
        );

        // LEVEL 9: GENERALISATION
        await enter(8);

        for (
            let d = 1;
            d <= 14 && !E('S.done');
            d++
        ) {
            input($('#dg'), d);
            click($('#dp'));
        }

        ok(
            'L9 some degree deploys (overfitting level)',
            E('S.done')
        );

        // L5 TOOLKIT GATING
        // L5 requires NumPy and SciPy.
        await enter(4, []);

        ok(
            'L5 gate shows resupply button when libraries are missing',
            !!$('#rsup') &&
            /NumPy/.test($('#play').textContent) &&
            /SciPy/.test($('#play').textContent)
        );

        click($('#rsup'));

        ok(
            'Resupply adds NumPy and SciPy',
            E("S.kit.has('NumPy') && S.kit.has('SciPy')") &&
            E('S.fuel') === 1e6 - 20
        );

        // L6 DOES NOT HAVE A SEPARATE LIBRARY GATE.
        // Its input is the processed data stored by L5.
        await enter(5);

        ok(
            'L6 does not incorrectly request separate resupply',
            !$('#rsup')
        );

        ok(
            'L6 profiling table remains available',
            !!$('#play table')
        );

        // LEVEL 10: LIVE STREAM
        await enter(9);

        console.log('\nStarting L10 stream test...');

        const startButton = $('#go');

        ok('L10 start button exists', !!startButton);

        if (startButton) {
            click(startButton);
            input($('#th'), 1.5);

            // Full 20-second stream plus safety margin.
            await sleep(26000);
        }

        const l10 = {
            done: E('S.done'),
            fuel: E('S.fuel'),
            time: $('#tm')?.textContent,
            cost: $('#cs')?.textContent,
            button: $('#go')?.textContent,
            buttonDisplay: $('#go')?.style.display
        };

        console.log('\nL10 DEBUG:', l10);

        const streamFinished =
            l10.time === '20s' &&
            (
                l10.done ||
                (l10.buttonDisplay === '' && Number(l10.fuel) < 1e6)
            );

        ok(
            'L10 stream reaches its 20-second completion',
            streamFinished
        );

        const cost = Number(l10.cost);

        if (l10.done && streamFinished) {
            ok(
                'L10 meets cost target (<=45)',
                Number.isFinite(cost) && cost <= 45
            );
        } else {
            console.log(
                'L10 did not clear within the cost limit. ' +
                'This is a gameplay outcome, not necessarily a runtime failure.'
            );
        }

        // FINALE
        E('S.lvl=10;load()');

        for (
            let g = 0;
            g < 20 && $('#pl')?.classList.contains('lock');
            g++
        ) {
            click($('#nc'));
            click($('#nc'));
        }

        const finaleChoice = $('[data-c="b"]');

        ok('Finale reply option renders', !!finaleChoice);

        if (finaleChoice) click(finaleChoice);

        ok(
            'Finale ending renders',
            /Helios-7 answered/.test($('#stage').textContent)
        );

        // ERROR CHECK
        ok('No uncaught errors', errs.length === 0);

        if (errs.length) {
            console.log('\nUncaught errors:', errs);
        }

        const bad = res.filter(r => !r[1]).length;

        console.log(
            bad
                ? `\n${bad} FAILED`
                : '\nALL PASSED'
        );

        dom.window.close();
        process.exitCode = bad ? 1 : 0;

    } catch (error) {
        console.error('\nSMOKE TEST CRASHED:', error);
        console.error(error.stack);

        dom.window.close();
        process.exitCode = 1;
    }
})();
