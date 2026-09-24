const $ = id => document.getElementById(id);
const PETG_METERS_PER_KG = 327;
const PETG_CENTIMETERS_PER_KG = PETG_METERS_PER_KG * 100;
const THEME_STORAGE_KEY = 'print-calculator-theme';

function getCurrencyConfig() {
    const selected = $('currency')?.value || 'PHP';
    if (selected === 'USD') {
        return { locale: 'en-US', currency: 'USD' };
    }
    return { locale: 'en-PH', currency: 'PHP' };
}

function fmt(n) {
    const { locale, currency } = getCurrencyConfig();
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    }).format(n);
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    $('themeSwitch').checked = isDark;
}

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        applyTheme(savedTheme);
        return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

function materialCost(amount, unit, price, unitPrice){
    switch(unit){
        case 'kg':
            switch(unitPrice){
                case 'kg': return price * amount;
                case 'g': return price * amount * 1000;
                case 'm': return price * amount * PETG_METERS_PER_KG;
                case 'cm': return price * amount * PETG_CENTIMETERS_PER_KG;
            }
            break;
        case 'g':
            switch(unitPrice){
                case 'kg': return price * (amount / 1000);
                case 'g': return price * amount;
                case 'm': return price * (amount / 1000) * PETG_METERS_PER_KG;
                case 'cm': return price * (amount / 1000) * PETG_CENTIMETERS_PER_KG;
            }
            break;
        case 'm':
            switch(unitPrice){
                case 'kg': return price * (amount / PETG_METERS_PER_KG);
                case 'g': return price * ((amount / PETG_METERS_PER_KG) * 1000);
                case 'm': return price * amount;
                case 'cm': return price * (amount * 100);
            }
            break;
        case 'cm':
            switch(unitPrice){
                case 'kg': return price * (amount / PETG_CENTIMETERS_PER_KG);
                case 'g': return price * ((amount / PETG_CENTIMETERS_PER_KG) * 1000);
                case 'm': return price * (amount / 100);
                case 'cm': return price * amount;
            }
            break;
    }

    return 0;
}

function readNumber(id, min = 0, max = Number.POSITIVE_INFINITY) {
    const field = $(id);
    const value = Number(field.value);
    const valid = Number.isFinite(value) && value >= min && value <= max;
    field.setCustomValidity(valid ? '' : `Enter a number from ${min} to ${max}.`);
    field.classList.toggle('invalid', !valid);
    return valid ? value : 0;
}

function parseFirstNumber(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseFloat(match[1]);
        }
    }

    return null;
}

function parseSlicerTime(text) {
    const seconds = parseFirstNumber(text, [
        /^;?\s*TIME\s*[:=]\s*(\d+(?:\.\d+)?)/im,
        /^;?\s*estimated printing time.*?[:=]\s*(\d+(?:\.\d+)?)\s*s\b/im,
        /^;?\s*total estimated time.*?[:=]\s*(\d+(?:\.\d+)?)\s*s\b/im
    ]);

    if (seconds !== null) {
        return seconds / 3600;
    }

    const timeTextMatch = text.match(/^;?\s*(?:estimated printing time|total estimated time).*?[:=]\s*([^\r\n]+)/im);
    if (!timeTextMatch) {
        return null;
    }

    const timeText = timeTextMatch[1];
    const hours = parseFloat(timeText.match(/(\d+(?:\.\d+)?)\s*h/i)?.[1] || 0);
    const minutes = parseFloat(timeText.match(/(\d+(?:\.\d+)?)\s*m/i)?.[1] || 0);
    const timeSeconds = parseFloat(timeText.match(/(\d+(?:\.\d+)?)\s*s/i)?.[1] || 0);
    const totalHours = hours + (minutes / 60) + (timeSeconds / 3600);

    return totalHours > 0 ? totalHours : null;
}

function parseFilamentType(text) {
    const match = text.match(/^;?\s*filament_type\s*[:=]\s*([^\r\n,;]+)/im);
    if (!match) {
        return null;
    }

    return match[1].trim().toUpperCase();
}

function setFilamentTypeFromSlicer(type) {
    if (!type) {
        return false;
    }

    const filamentType = $('filamentType');
    const option = [...filamentType.options].find(item => item.textContent.toUpperCase().includes(type));
    if (!option) {
        return false;
    }

    filamentType.value = option.value;
    return true;
}

function applySlicerOutput(text, fileName) {
    const filamentGrams = parseFirstNumber(text, [
        /^;?\s*(?:total\s+)?filament used\s*\[g\]\s*[:=]\s*(\d+(?:\.\d+)?)/im,
        /^;?\s*filament weight\s*[:=]\s*(\d+(?:\.\d+)?)\s*g\b/im,
        /^;?\s*filament used\s*[:=]\s*(\d+(?:\.\d+)?)\s*g\b/im
    ]);
    const filamentMeters = parseFirstNumber(text, [
        /^;?\s*(?:total\s+)?filament used\s*\[m\]\s*[:=]\s*(\d+(?:\.\d+)?)/im,
        /^;?\s*filament used\s*[:=]\s*(\d+(?:\.\d+)?)\s*m\b/im
    ]);
    const printTime = parseSlicerTime(text);
    const filamentType = parseFilamentType(text);

    const imported = [];

    if (filamentGrams !== null) {
        $('filamentAmount').value = filamentGrams.toFixed(2);
        $('filamentUnit').value = 'g';
        imported.push(`${filamentGrams.toFixed(2)} g filament`);
    } else if (filamentMeters !== null) {
        $('filamentAmount').value = filamentMeters.toFixed(2);
        $('filamentUnit').value = 'm';
        imported.push(`${filamentMeters.toFixed(2)} m filament`);
    }

    if (printTime !== null) {
        const wholeHours = Math.floor(printTime);
        const wholeMinutes = Math.round((printTime - wholeHours) * 60);
        $('printHours').value = wholeHours + Math.floor(wholeMinutes / 60);
        $('printMinutes').value = wholeMinutes % 60;
        imported.push(`${$('printHours').value}h ${$('printMinutes').value}m print time`);
    }

    if (setFilamentTypeFromSlicer(filamentType)) {
        imported.push(`${filamentType} material`);
    }

    $('gcodeStatus').textContent = imported.length
        ? `Imported from ${fileName}: ${imported.join(', ')}.`
        : `Could not find filament or print time metadata in ${fileName}.`;

    calculate();
}

async function importGcodeFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
        $('gcodeStatus').textContent = 'No slicer file imported.';
        return;
    }

    $('gcodeStatus').textContent = `Reading ${file.name}...`;

    try {
        const text = await file.text();
        applySlicerOutput(text, file.name);
    } catch (error) {
        $('gcodeStatus').textContent = `Could not read ${file.name}.`;
    }
}

function calculate(){
    const amount = readNumber('filamentAmount');
    const unit = $('filamentUnit').value;
    const priceValue = readNumber('priceValue');
    const priceUnit = $('priceUnit').value;

    const mat = materialCost(amount, unit, priceValue, priceUnit);

    const machineRate = readNumber('machineRate');
    const hours = readNumber('printHours');
    const minutes = readNumber('printMinutes', 0, 59);
    const printTime = hours + (minutes/60);
    const mach = machineRate * printTime;

    const powerW = readNumber('powerW');
    const elecRate = readNumber('elecRate');
    const energy = (powerW/1000) * printTime * elecRate;

    const design = readNumber('designLabor');
    const packaging = readNumber('packaging');
    const shipping = readNumber('shipping');
    const qty = Math.max(1, Math.floor(readNumber('quantity', 1)));

    const spTotal = packaging + shipping;

    const unitSubtotal = mat + mach + energy + design;
    const orderSubtotal = (unitSubtotal * qty) + spTotal;
    const profitPct = readNumber('profitPct');
    const profitAmt = orderSubtotal * (profitPct/100);
    const beforeDiscount = orderSubtotal + profitAmt;
    const discountPct = readNumber('discountPct', 0, 100);
    const discountAmt = beforeDiscount * (discountPct / 100);
    const finalOrder = beforeDiscount - discountAmt;
    const finalUnit = finalOrder / qty;

    $('matAmt').textContent = fmt(mat);
    $('machAmt').textContent = fmt(mach);
    $('enerAmt').textContent = fmt(energy);
    $('dlAmt').textContent = fmt(design);
    $('spAmt').textContent = fmt(spTotal);
    $('subt').textContent = fmt(orderSubtotal);
    $('profitAmt').textContent = fmt(profitAmt);
    $('discountAmt').textContent = fmt(discountAmt);
    $('finalOrder').textContent = fmt(finalOrder);
    $('finalUnit').textContent = fmt(finalUnit);
    $('pctLabel').textContent = profitPct.toFixed(2);
    return { mat, mach, energy, design, spTotal, orderSubtotal, profitAmt, discountAmt, finalOrder, finalUnit, qty };
}

$('calc').addEventListener('click', calculate);
$('reset').addEventListener('click', ()=> location.reload());
$('currency').addEventListener('change', calculate);
$('gcodeFile').addEventListener('change', importGcodeFile);
$('currency').value = 'PHP';
$('currency').disabled = true;
$('currency').closest('div')?.setAttribute('aria-label', 'Currency is fixed to Philippine pesos');
$('printQuote').addEventListener('click', () => window.print());
$('exportCsv').addEventListener('click', () => {
    const result = calculate();
    const rows = [
        ['3D Printing Quotation', ''], ['Currency', 'PHP'], ['Material', result.mat],
        ['Machine', result.mach], ['Energy', result.energy], ['Design & Labor', result.design],
        ['Shipping & Packaging', result.spTotal], ['Subtotal', result.orderSubtotal],
        ['Profit', result.profitAmt], ['Discount', result.discountAmt],
        ['Final Order Price', result.finalOrder], ['Quantity', result.qty], ['Final Unit Price', result.finalUnit]
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = '3d-print-quotation.csv';
    link.click();
    URL.revokeObjectURL(link.href);
});
$('themeSwitch').addEventListener('change', (event) => {
    const theme = event.target.checked ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
});

initializeTheme();
calculate();

document.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('input', calculate);
    field.addEventListener('change', calculate);
});
