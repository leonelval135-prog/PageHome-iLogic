// --- CONFIGURACIÓN DE TAILWIND ---
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    blue: '#2563eb', 
                    blueLight: '#eff6ff', 
                    blueHover: '#1d4ed8', 
                    black: '#0a0f1c', 
                    blackHover: '#1e293b' 
                }
            }
        }
    }
}

// --- CONFIGURACIÓN DE ÁREAS Y CAMPOS DINÁMICOS ---
const areaConfig = {
    tecnologia: { 
        name: "Tecnología & IT", 
        skillsPlaceholder: "Ej: React, Python, AWS, Metodologías Ágiles...",
        dynamicFields: [
            { id: 'portfolio', label: 'GitHub / Portfolio', placeholder: 'github.com/usuario' },
            { id: 'stack', label: 'Stack Principal (Herramientas)', placeholder: 'Ej. MERN, LAMP, AWS...' }
        ]
    },
    salud: { 
        name: "Salud & Medicina", 
        skillsPlaceholder: "Ej: Atención al paciente, RCP, Triage, Historias clínicas...",
        dynamicFields: [
            { id: 'cedula', label: 'Número de Colegiado / Cédula', placeholder: 'Ej. 12345678' },
            { id: 'especialidad', label: 'Especialidad Médica', placeholder: 'Ej. Pediatría, Cirugía General...' }
        ]
    },
    diseno: { 
        name: "Diseño & Arte", 
        skillsPlaceholder: "Ej: Figma, Adobe Suite, UX/UI, Prototipado...",
        dynamicFields: [
            { id: 'behance', label: 'Behance / Dribbble / Portfolio', placeholder: 'behance.net/usuario' },
            { id: 'estilo', label: 'Estilo / Enfoque', placeholder: 'Ej. Minimalista, User-Centered...' }
        ]
    },
    negocios: { 
        name: "Ventas & Negocios", 
        skillsPlaceholder: "Ej: CRM, Negociación B2B, Análisis de mercado, HubSpot...",
        dynamicFields: [
            { id: 'kpi', label: 'Métrica/KPI Destacado', placeholder: 'Ej. +30% crecimiento anual' }
        ]
    },
    educacion: { 
        name: "Educación", 
        skillsPlaceholder: "Ej: Pedagogía, Moodle, Planificación, Evaluación continua...",
        dynamicFields: [
            { id: 'nivelImpartido', label: 'Nivel Educativo que imparte', placeholder: 'Ej. Primaria, Universitaria...' }
        ]
    },
    general: { 
        name: "General / Otro", 
        skillsPlaceholder: "Ej: Trabajo en equipo, Resolución de problemas, Gestión de tiempo...",
        dynamicFields: []
    }
};

const educationLevels = [
    "Bachillerato / Preparatoria",
    "Técnico / Formación Profesional",
    "Licenciatura / Grado Universitario",
    "Maestría / Posgrado",
    "Doctorado",
    "Diplomado / Certificación",
    "Otro"
];

// --- ESTADO DEL CV ---
let currentArea = 'general';
let cvData = {
    personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '' },
    areaSpecific: {}, 
    summary: '',
    experience: [],
    education: [],
    skills: ''
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if(savedKey) {
        document.getElementById('input-api-key').value = savedKey;
    }

    document.addEventListener('mousedown', (e) => {
        const container = document.getElementById('export-menu-container');
        const dropdown = document.getElementById('export-dropdown');
        if (container && dropdown && !container.contains(e.target)) {
            dropdown.classList.add('hidden');
            document.getElementById('export-caret').classList.remove('rotate-180');
        }
    });
});

// --- MANEJO DE API KEY MODAL ---
function openApiModal() {
    const modal = document.getElementById('api-modal');
    modal.classList.remove('hidden');
}

function closeApiModal() {
    const modal = document.getElementById('api-modal');
    modal.classList.add('hidden');
}

function saveApiKey() {
    const key = document.getElementById('input-api-key').value.trim();
    if(key) {
        localStorage.setItem('gemini_api_key', key);
        showToast("API Key guardada correctamente.", 'success');
        closeApiModal();
    } else {
        localStorage.removeItem('gemini_api_key');
        showToast("API Key eliminada.", 'success');
        closeApiModal();
    }
}

// --- FLUJO DE PANTALLAS Y BOTONES DE VOLVER ATRÁS ---
function goToAreaSelection() {
    const landing = document.getElementById('landing-screen');
    const selection = document.getElementById('area-selection-screen');
    
    landing.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => {
        landing.classList.add('hidden');
        selection.classList.remove('hidden');
        selection.classList.add('animate-reveal');
    }, 300);
}

function goBackToLanding() {
    const landing = document.getElementById('landing-screen');
    const selection = document.getElementById('area-selection-screen');
    
    selection.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    selection.classList.remove('animate-reveal');
    
    setTimeout(() => {
        selection.classList.add('hidden');
        selection.classList.remove('opacity-0');
        landing.classList.remove('hidden');
        landing.classList.remove('opacity-0');
    }, 300);
}

function selectArea(areaKey) {
    currentArea = areaKey;
    
    document.getElementById('header-area-label').textContent = `Sector: ${areaConfig[areaKey].name}`;
    document.getElementById('input-skills').placeholder = areaConfig[areaKey].skillsPlaceholder;
    
    renderDynamicFields();

    if(cvData.experience.length === 0) addExperience(false);
    if(cvData.education.length === 0) addEducation(false);

    const screen1 = document.getElementById('area-selection-screen');
    const screen2 = document.getElementById('main-editor-screen');
    
    screen1.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => {
        screen1.classList.add('hidden');
        screen2.classList.remove('hidden');
        screen2.classList.add('animate-reveal');
        renderPreview();
        window.scrollTo(0,0); 
    }, 300);
}

function goBackFromEditor() {
    const screen1 = document.getElementById('area-selection-screen');
    const screen2 = document.getElementById('main-editor-screen');
    
    screen2.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    screen2.classList.remove('animate-reveal');
    
    setTimeout(() => {
        screen2.classList.add('hidden');
        screen2.classList.remove('opacity-0');
        screen1.classList.remove('hidden');
        screen1.classList.remove('opacity-0');
        screen1.classList.add('animate-reveal');
    }, 300);
}

function renderDynamicFields() {
    const container = document.getElementById('dynamic-fields-container');
    const grid = document.getElementById('dynamic-fields-grid');
    const fields = areaConfig[currentArea].dynamicFields;

    cvData.areaSpecific = {};

    if (fields && fields.length > 0) {
        document.getElementById('dynamic-sector-name').textContent = areaConfig[currentArea].name;
        grid.innerHTML = '';
        fields.forEach(field => {
            cvData.areaSpecific[field.id] = '';
            grid.innerHTML += `
                <div class="input-group">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">${field.label}</label>
                    <input type="text" oninput="updateAreaSpecificData('${field.id}', this.value)" class="input-pro" placeholder="${field.placeholder}" />
                </div>
            `;
        });
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// --- MANEJADORES DE ESTADO ---
function updateData(section, field, value) {
    if (section === 'personal') cvData.personal[field] = value;
    else if (section === 'summary' || section === 'skills') cvData[section] = value;
    renderPreview();
}

function updateAreaSpecificData(key, value) {
    cvData.areaSpecific[key] = value;
    renderPreview();
}

function updateArrayData(section, id, field, value) {
    const index = cvData[section].findIndex(item => item.id === id);
    if (index !== -1) {
        cvData[section][index][field] = value;
        renderPreview();
    }
}

// --- EXPERIENCIA ---
function addExperience(reRender = true) {
    cvData.experience.push({ id: crypto.randomUUID(), company: '', role: '', startDate: '', endDate: '', description: '' });
    if(reRender) { renderExperienceEditor(); renderPreview(); } else { renderExperienceEditor(); }
}

function removeExperience(id) {
    cvData.experience = cvData.experience.filter(exp => exp.id !== id);
    renderExperienceEditor(); renderPreview();
}

function renderExperienceEditor() {
    const container = document.getElementById('experience-list');
    container.innerHTML = '';
    
    cvData.experience.forEach(exp => {
        const div = document.createElement('div');
        div.className = 'p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative group';
        div.innerHTML = `
            <button onclick="removeExperience('${exp.id}')" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                <i class="ph-bold ph-trash"></i>
            </button>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-6">
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Puesto</label>
                    <input type="text" value="${exp.role}" oninput="updateArrayData('experience', '${exp.id}', 'role', this.value)" class="input-pro !py-1.5" placeholder="Ej. Especialista" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Empresa</label>
                    <input type="text" value="${exp.company}" oninput="updateArrayData('experience', '${exp.id}', 'company', this.value)" class="input-pro !py-1.5" placeholder="Ej. Empresa Corp" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Inicio</label>
                    <input type="text" value="${exp.startDate}" oninput="updateArrayData('experience', '${exp.id}', 'startDate', this.value)" class="input-pro !py-1.5" placeholder="Ej. 2020" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Fin</label>
                    <input type="text" value="${exp.endDate}" oninput="updateArrayData('experience', '${exp.id}', 'endDate', this.value)" class="input-pro !py-1.5" placeholder="Ej. Presente" />
                </div>
            </div>
            
            <div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-2">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase">Logros y Tareas</label>
                    <button id="btn-exp-${exp.id}" onclick="improveExperience('${exp.id}')" class="flex items-center justify-center gap-1 text-[10px] bg-brand-black text-white px-2 py-1 rounded hover:bg-brand-blue transition-colors font-bold w-full sm:w-auto">
                        <i id="icon-exp-${exp.id}" class="ph-bold ph-magic-wand"></i>
                        <span id="text-exp-${exp.id}">Mejorar texto</span>
                    </button>
                </div>
                <textarea id="desc-exp-${exp.id}" oninput="updateArrayData('experience', '${exp.id}', 'description', this.value)" rows="3" class="input-pro resize-none text-sm" placeholder="Describe brevemente tus responsabilidades y logros principales...">${exp.description}</textarea>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- EDUCACIÓN ---
function addEducation(reRender = true) {
    cvData.education.push({ id: crypto.randomUUID(), level: '', school: '', degree: '', year: '' });
    if(reRender) { renderEducationEditor(); renderPreview(); } else { renderEducationEditor(); }
}

function removeEducation(id) {
    cvData.education = cvData.education.filter(edu => edu.id !== id);
    renderEducationEditor(); renderPreview();
}

function renderEducationEditor() {
    const container = document.getElementById('education-list');
    container.innerHTML = '';
    
    cvData.education.forEach(edu => {
        const optionsHTML = educationLevels.map(lvl => 
            `<option value="${lvl}" ${edu.level === lvl ? 'selected' : ''}>${lvl}</option>`
        ).join('');

        const div = document.createElement('div');
        div.className = 'p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative group';
        div.innerHTML = `
            <button onclick="removeEducation('${edu.id}')" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                <i class="ph-bold ph-trash"></i>
            </button>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                <div class="sm:col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Nivel de Estudios (Grado Máximo)</label>
                    <select onchange="updateArrayData('education', '${edu.id}', 'level', this.value)" class="input-pro !py-1.5 font-medium text-gray-700">
                        <option value="" disabled ${!edu.level ? 'selected' : ''}>Selecciona un nivel...</option>
                        ${optionsHTML}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Institución Educativa</label>
                    <input type="text" value="${edu.school}" oninput="updateArrayData('education', '${edu.id}', 'school', this.value)" class="input-pro !py-1.5" placeholder="Ej. Universidad Autónoma" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Carrera / Especialidad</label>
                    <input type="text" value="${edu.degree}" oninput="updateArrayData('education', '${edu.id}', 'degree', this.value)" class="input-pro !py-1.5" placeholder="Ej. Ing. en Sistemas" />
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Año o Período</label>
                    <input type="text" value="${edu.year}" oninput="updateArrayData('education', '${edu.id}', 'year', this.value)" class="input-pro !py-1.5" placeholder="Ej. 2018 - 2022" />
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// --- RENDERIZADO DE LA VISTA PREVIA ---
function renderPreview() {
    const container = document.getElementById('cv-preview-container');
    const { personal, summary, experience, education, skills, areaSpecific } = cvData;

    const displayName = personal.fullName || 'Nombre Completo';
    const displayTitle = personal.jobTitle || 'Profesión';

    let contactHTML = '';
    if (personal.email) contactHTML += `<div class="flex items-center gap-1.5"><i class="ph-bold ph-envelope-simple text-brand-blue"></i><span class="text-xs font-medium text-gray-600">${escapeHTML(personal.email)}</span></div>`;
    if (personal.phone) contactHTML += `<div class="flex items-center gap-1.5"><i class="ph-bold ph-phone text-brand-blue"></i><span class="text-xs font-medium text-gray-600">${escapeHTML(personal.phone)}</span></div>`;
    if (personal.location) contactHTML += `<div class="flex items-center gap-1.5"><i class="ph-bold ph-map-pin text-brand-blue"></i><span class="text-xs font-medium text-gray-600">${escapeHTML(personal.location)}</span></div>`;
    if (personal.website) contactHTML += `<div class="flex items-center gap-1.5"><i class="ph-bold ph-globe text-brand-blue"></i><span class="text-xs font-medium text-gray-600">${escapeHTML(personal.website)}</span></div>`;

    let dynamicHTML = '';
    const activeDynamicFields = Object.entries(areaSpecific).filter(([k, v]) => v.trim() !== '');
    if (activeDynamicFields.length > 0) {
        activeDynamicFields.forEach(([key, value]) => {
            const fieldConfig = areaConfig[currentArea].dynamicFields.find(f => f.id === key);
            if(fieldConfig) {
                dynamicHTML += `<div class="flex items-center gap-1.5"><i class="ph-bold ph-check-circle text-brand-blue"></i><span class="text-xs font-semibold text-brand-black">${fieldConfig.label}:</span> <span class="text-xs text-gray-600">${escapeHTML(value)}</span></div>`;
            }
        });
    }

    const validExp = experience.filter(exp => exp.role || exp.company || exp.description);
    const validEdu = education.filter(edu => edu.degree || edu.school || edu.level);

    let experienceHTML = '';
    if (validExp.length > 0) {
        experienceHTML = `
            <section class="mt-8">
                <h3 class="text-sm font-bold text-brand-black uppercase tracking-widest border-b-2 border-brand-black pb-1 mb-5">Experiencia Profesional</h3>
                <div class="space-y-6">
                    ${validExp.map(exp => `
                        <div>
                            <div class="flex justify-between items-baseline mb-0.5">
                                <h4 class="text-base font-bold text-brand-black">${escapeHTML(exp.role) || 'Puesto no especificado'}</h4>
                                <span class="text-xs font-bold text-brand-blue tracking-wide text-right ml-2">
                                    ${escapeHTML(exp.startDate)} ${exp.startDate && exp.endDate ? '—' : ''} ${escapeHTML(exp.endDate)}
                                </span>
                            </div>
                            <div class="text-sm font-semibold text-gray-500 mb-2">${escapeHTML(exp.company) || 'Empresa'}</div>
                            ${exp.description ? `<div class="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">${escapeHTML(exp.description)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    let educationHTML = '';
    if (validEdu.length > 0) {
        educationHTML = `
            <section class="mt-8">
                <h3 class="text-sm font-bold text-brand-black uppercase tracking-widest border-b-2 border-brand-black pb-1 mb-5">Formación Académica</h3>
                <div class="space-y-5">
                    ${validEdu.map(edu => `
                        <div>
                            ${edu.level ? `<div class="text-[10px] font-bold text-brand-blue uppercase tracking-wider mb-0.5">${escapeHTML(edu.level)}</div>` : ''}
                            <h4 class="text-[13px] font-bold text-brand-black leading-tight">${escapeHTML(edu.degree) || 'Especialidad / Carrera'}</h4>
                            <div class="flex justify-between items-baseline mt-1">
                                <div class="text-xs font-medium text-gray-500">${escapeHTML(edu.school) || 'Institución'}</div>
                                <div class="text-xs font-bold text-brand-black text-right ml-2">${escapeHTML(edu.year)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    let skillsHTML = '';
    if (skills.trim()) {
        const skillsList = skills.split(',').map(s => s.trim()).filter(s => s !== '');
        skillsHTML = `
            <section class="mt-8">
                <h3 class="text-sm font-bold text-brand-black uppercase tracking-widest border-b-2 border-brand-black pb-1 mb-5">Habilidades</h3>
                <div class="flex flex-wrap gap-2">
                    ${skillsList.map(skill => `<span class="bg-gray-100 text-brand-black text-[11px] font-bold px-2.5 py-1.5 rounded-md border border-gray-200">${escapeHTML(skill)}</span>`).join('')}
                </div>
            </section>
        `;
    }

    container.innerHTML = `
        <div class="mb-8">
            <h1 class="text-3xl md:text-4xl font-extrabold text-brand-black uppercase tracking-tight mb-2">
                ${escapeHTML(displayName)}
            </h1>
            <h2 class="text-lg font-bold text-brand-blue uppercase tracking-widest mb-4">
                ${escapeHTML(displayTitle)}
            </h2>
            
            ${contactHTML || dynamicHTML ? `
                <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                    <div class="flex flex-wrap gap-x-5 gap-y-2">${contactHTML}</div>
                    ${dynamicHTML ? `<div class="flex flex-wrap gap-x-5 gap-y-2 mt-1">${dynamicHTML}</div>` : ''}
                </div>
            ` : ''}
        </div>

        ${summary ? `
            <section class="mt-8">
                <h3 class="text-sm font-bold text-brand-black uppercase tracking-widest border-b-2 border-brand-black pb-1 mb-3">Perfil Profesional</h3>
                <p class="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">${escapeHTML(summary)}</p>
            </section>
        ` : ''}

        <div class="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-12">
            <div>${experienceHTML}</div>
            <div>
                ${skillsHTML}
                ${educationHTML}
            </div>
        </div>
    `;
}

function escapeHTML(str) {
    if(!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
    );
}

// --- SISTEMA TOAST ---
let toastTimeout;
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast-container');
    const icon = document.getElementById('toast-icon');
    const text = document.getElementById('toast-message');
    
    text.textContent = message;
    
    if (type === 'success') {
        toast.className = 'fixed bottom-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-300 no-print bg-emerald-600 toast-enter';
        icon.className = 'ph-bold ph-check-circle text-lg';
    } else {
        toast.className = 'fixed bottom-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-300 no-print bg-red-600 toast-enter';
        icon.className = 'ph-bold ph-warning-circle text-lg';
    }
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideToast, 4000);
}
function hideToast() {
    document.getElementById('toast-container').classList.add('hidden');
}

// --- EXPORTACIÓN ---
function toggleExportMenu() {
    document.getElementById('export-dropdown').classList.toggle('hidden');
    document.getElementById('export-caret').classList.toggle('rotate-180');
}

function exportToPDF() { window.print(); toggleExportMenu(); }

function exportToJSON() {
    downloadFile(JSON.stringify(cvData, null, 2), 'Vitaris_profesional.json', 'application/json');
}

function exportToTXT() {
    let txt = `CURRÍCULUM VITAE: ${cvData.personal.fullName || 'Sin nombre'}\n`;
    txt += `Puesto: ${cvData.personal.jobTitle || 'No especificado'}\n`;
    txt += `Sector: ${areaConfig[currentArea].name}\n`;
    txt += `=================================================\n\n`;
    
    txt += `--- CONTACTO ---\n`;
    if(cvData.personal.email) txt += `Email: ${cvData.personal.email}\n`;
    if(cvData.personal.phone) txt += `Teléfono: ${cvData.personal.phone}\n`;
    if(cvData.personal.location) txt += `Ubicación: ${cvData.personal.location}\n`;
    if(cvData.personal.website) txt += `Web/LinkedIn: ${cvData.personal.website}\n`;
    
    const activeDynamicFields = Object.entries(cvData.areaSpecific).filter(([k, v]) => v.trim() !== '');
    if (activeDynamicFields.length > 0) {
        activeDynamicFields.forEach(([key, value]) => {
            const fieldConfig = areaConfig[currentArea].dynamicFields.find(f => f.id === key);
            if(fieldConfig) txt += `${fieldConfig.label}: ${value}\n`;
        });
    }
    txt += `\n`;

    if (cvData.summary) {
        txt += `--- PERFIL PROFESIONAL ---\n`;
        txt += `${cvData.summary}\n\n`;
    }

    const validExp = cvData.experience.filter(exp => exp.role || exp.company);
    if (validExp.length > 0) {
        txt += `--- EXPERIENCIA PROFESIONAL ---\n`;
        validExp.forEach(exp => {
            txt += `• Puesto: ${exp.role || 'No especificado'}\n`;
            txt += `  Empresa: ${exp.company || 'No especificado'}\n`;
            txt += `  Periodo: ${exp.startDate || ''} - ${exp.endDate || ''}\n`;
            if (exp.description) txt += `  Descripción:\n    ${exp.description.replace(/\n/g, '\n    ')}\n`;
            txt += `\n`;
        });
    }

    const validEdu = cvData.education.filter(edu => edu.degree || edu.school);
    if (validEdu.length > 0) {
        txt += `--- FORMACIÓN ACADÉMICA ---\n`;
        validEdu.forEach(edu => {
            if (edu.level) txt += `• Nivel: ${edu.level}\n`;
            txt += `  Grado/Título: ${edu.degree || 'No especificado'}\n`;
            txt += `  Institución: ${edu.school || 'No especificado'}\n`;
            if (edu.year) txt += `  Periodo: ${edu.year}\n`;
            txt += `\n`;
        });
    }

    if (cvData.skills) {
        txt += `--- HABILIDADES ---\n`;
        txt += `${cvData.skills}\n`;
    }

    downloadFile(txt, 'Vitaris_profesional.txt', 'text/plain');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url); toggleExportMenu();
}

// --- INTEGRACIÓN GEMINI API CON MANEJO DE KEY LOCAL ---
async function callGeminiAI(prompt, systemInstruction) {
    // Se usa la constante de entorno si existe, sino busca en el LocalStorage
    const envKey = "AQ.Ab8RN6Io1dlUECfkfaeGGXHyZwJOh1oznmKCtDRTqRmRxB7SAQ"; 
    const localKey = localStorage.getItem('gemini_api_key') || "";
    const apiKey = envKey || localKey;

    if (!apiKey) {
        openApiModal();
        throw new Error("Por favor, configura tu API Key de Gemini para usar la IA.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };

    for (let i = 0; i < 5; i++) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 400 || response.status === 403) {
                    openApiModal();
                    throw new Error("La API Key proporcionada no es válida o ha caducado.");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error) {
            if (error.message.includes("API Key")) throw error; 
            if (i === 4) throw new Error("No se pudo conectar con la IA tras varios intentos.");
            await new Promise(res => setTimeout(res, [1000, 2000, 4000, 8000, 16000][i]));
        }
    }
}

async function generateSummary() {
    if (!cvData.personal.jobTitle) { showToast("Ingresa tu Puesto (Paso 1) antes de redactar.", 'error'); return; }
    
    const btn = document.getElementById('btn-generate-summary');
    const icon = document.getElementById('icon-summary-ai');
    const text = document.getElementById('text-summary-ai');
    
    btn.disabled = true; icon.className = 'ph-bold ph-spinner animate-spin'; text.textContent = 'Generando...';

    try {
        const areaContext = areaConfig[currentArea].name;
        const dynamicContextStr = Object.entries(cvData.areaSpecific)
            .filter(([k, v]) => v.trim() !== '')
            .map(([k, v]) => `${areaConfig[currentArea].dynamicFields.find(f=>f.id===k)?.label}: ${v}`).join(', ');
        
        const prompt = `Puesto: ${cvData.personal.jobTitle}. Sector: ${areaContext}. Habilidades: ${cvData.skills}. Extras: ${dynamicContextStr}.`;
        const systemInstruction = `Eres un experto Headhunter. Redacta un perfil profesional (resumen) muy serio, impactante y conciso (máximo 4 líneas). Adapta fuertemente el tono al sector indicado. NO uses saludos ni comillas. Responde ÚNICAMENTE con el perfil en español.`;
        
        const generatedText = await callGeminiAI(prompt, systemInstruction);
        cvData.summary = generatedText.trim();
        document.getElementById('input-summary').value = cvData.summary;
        renderPreview();
        showToast("Perfil redactado exitosamente.", 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false; icon.className = 'ph-bold ph-sparkle'; text.textContent = 'Redactar con IA';
    }
}

async function improveExperience(id) {
    const exp = cvData.experience.find(e => e.id === id);
    if (!exp.description || !exp.role) { showToast("Llena el Puesto y una descripción básica antes.", 'error'); return; }

    const btn = document.getElementById(`btn-exp-${id}`);
    const icon = document.getElementById(`icon-exp-${id}`);
    const text = document.getElementById(`text-exp-${id}`);
    
    btn.disabled = true; icon.className = 'ph-bold ph-spinner animate-spin'; text.textContent = 'Procesando...';

    try {
        const prompt = `Sector: ${areaConfig[currentArea].name}. Puesto: ${exp.role} en ${exp.company}.\nDescripción original:\n${exp.description}`;
        const systemInstruction = `Eres un experto en currículums. Transforma la descripción en viñetas corporativas y orientadas a logros. Usa verbos de acción fuertes en pasado. Formato: usa "• " al inicio. Responde ÚNICAMENTE con las viñetas en español.`;

        const generatedText = await callGeminiAI(prompt, systemInstruction);
        exp.description = generatedText.trim();
        document.getElementById(`desc-exp-${id}`).value = exp.description;
        renderPreview();
        showToast("Texto mejorado.", 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false; icon.className = 'ph-bold ph-magic-wand'; text.textContent = 'Mejorar texto';
    }
}
