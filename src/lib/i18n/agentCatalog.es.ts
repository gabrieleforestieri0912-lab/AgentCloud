/**
 * Overlay en español del catálogo de agentes (slug → campos de visualización
 * localizados).
 *
 * El contenido canónico vive en `src/lib/agents.ts` en inglés; estos datos lo
 * sobrescriben mediante `localizeAgent()` cuando el idioma activo es el
 * español. La insignia (badge) NO está aquí: es una propiedad canónica del
 * agente y la traduce `localizeBadge()` en `./agentCatalog.ts`.
 */
import type { AgentLocalization } from "./agentCatalog";

export const AGENT_LOCALIZATIONS_ES: Record<string, AgentLocalization> = {
  "email-manager": {
    name: "Gestor de Email",
    shortName: "Email",
    category: "Negocio y operaciones",
    description:
      "Ordena tu bandeja, no pierdas nunca un compromiso importante y recibe un resumen diario.",
    longDescription:
      "El Gestor de Email pone orden en tu bandeja de entrada y mantiene bajo control cada compromiso. Clasifica los mensajes entrantes, etiqueta y archiva lo importante, redacta respuestas claras listas para aprobar y vigila plazos, reuniones y seguimientos escondidos en las conversaciones, convirtiéndolos en tareas con recordatorios. Resume el día en un breve digest, señala lo que requiere una decisión y da seguimiento a cada pendiente hasta cerrarlo. Conectado a Gmail, Google Calendar, Outlook y Slack, te ahorra horas de gestión de correo cada semana: responde a lo que importa y ningún compromiso importante se te escapa.",
    industry: "Fundadores, directivos y profesionales",
    tasks: [
      "Clasificación de la bandeja",
      "Borradores de respuesta",
      "Seguimiento de compromisos",
      "Resumen diario del email",
    ],
    workflow: [
      "Analiza la bandeja",
      "Clasifica y archiva",
      "Hace seguimiento de compromisos",
      "Entrega el resumen diario",
    ],
  },
  "business-manager": {
    name: "Business Manager",
    shortName: "Business",
    category: "Negocio y operaciones",
    description:
      "Un COO en el chat: informes, planificación y apoyo a la toma de decisiones.",
    longDescription:
      "El agente Business Manager actúa como jefe de gabinete para emprendedores y fundadores. Lee tus datos operativos, elabora informes ejecutivos, coordina el trabajo entre equipos y apoya la planificación y las decisiones. Conectado a Google Calendar, Gmail, Sheets y Slack, convierte hojas dispersas y actualizaciones de estado en una visión clara del negocio, para que los líderes tengan números y narrativa para decidir más rápido y hacer crecer la empresa sin dejar nada en el camino.",
    industry: "PYME y fundadores",
    tasks: [
      "Informes ejecutivos",
      "Análisis de datos operativos",
      "Coordinación transversal",
      "Recomendaciones estratégicas",
    ],
    workflow: [
      "Sincroniza Sheets + Calendar",
      "Analiza los KPI",
      "Crea el informe ejecutivo",
      "Propone acciones prioritarias",
    ],
  },
  "seo-agent": {
    name: "Agente de Contenido SEO",
    shortName: "SEO",
    category: "Marketing y ventas",
    description:
      "Escribe artículos estructurados y optimizados para keywords que de verdad posicionan.",
    longDescription:
      "El agente de Contenido SEO investiga los temas, analiza por qué se posicionan los competidores y produce artículos completos y optimizados para las keywords. Planifica la arquitectura H1/H2, integra las palabras clave objetivo de forma natural y añade automáticamente meta descripciones y enlaces internos. Conectado a Ahrefs, Google Search Console, WordPress y Notion, ayuda al equipo de contenidos a publicar más, posicionar antes y convertir mejor, con cada pieza enfocada a una intención de búsqueda real.",
    industry: "Equipos de marketing de contenidos",
    tasks: [
      "Investigación de keywords",
      "Análisis de la competencia",
      "Redacción de artículos",
      "Optimización de metadatos",
    ],
    workflow: [
      "Busca las keywords",
      "Estudia a los competidores",
      "Redacta el artículo",
      "Optimiza los metadatos",
    ],
  },
  "personal-assistant": {
    name: "Asistente Personal",
    shortName: "Asistente",
    category: "Negocio y operaciones",
    description:
      "Planifica tu día, vacía tu lista de tareas y recupera horas cada semana.",
    longDescription:
      "El Asistente Personal organiza tu jornada como haría un gran ayudante. Planifica el calendario, gestiona las listas de tareas, resume notas y documentos, reserva tiempo para el trabajo profundo y sugiere de forma proactiva por dónde empezar. Conectado a Google Calendar, Gmail, Notion y Slack, mantiene en el buen rumbo a profesionales y emprendedores ocupados, ayudándote a recuperar varias horas a la semana al quitarte la gestión operativa del día a día.",
    industry: "Profesionales y emprendedores",
    tasks: [
      "Planificación del día",
      "Gestión de tareas",
      "Investigación y síntesis",
      "Borradores y documentos",
    ],
    workflow: [
      "Escucha la petición",
      "Organiza las tareas",
      "Ejecuta con las herramientas",
      "Propone los próximos pasos",
    ],
  },
  "calendar-booking": {
    name: "Agente de Reservas",
    shortName: "Reservas",
    category: "Negocio y operaciones",
    description:
      "Busca huecos libres, reserva reuniones y envía las invitaciones automáticamente.",
    longDescription:
      "El agente de Reservas gestiona la planificación de principio a fin. Busca la disponibilidad en los calendarios de los participantes, propone los mejores horarios, reserva la reunión, confirma a los asistentes y adjunta el enlace de la videollamada. Conectado a Google Calendar, Outlook, Zoom y Slack, elimina el eterno intercambio de «¿cuándo te va bien?», un gran ahorro de tiempo para ventas consultivas, servicios y cualquier equipo que vive de llamadas programadas.",
    industry: "Equipos de agenda y reuniones",
    tasks: [
      "Búsqueda de disponibilidad",
      "Propuesta de horarios",
      "Reserva de eventos",
      "Enlaces de vídeo automáticos",
    ],
    workflow: [
      "Comprueba la disponibilidad",
      "Propone los horarios",
      "Confirma los detalles",
      "Reserva y confirma",
    ],
  },
  "lead-capture": {
    name: "Agente de Captación de Leads",
    shortName: "Lead Capture",
    category: "Marketing y ventas",
    description:
      "Captura cada lead, enriquécelo y avisa a ventas en cuestión de segundos.",
    longDescription:
      "El agente de Captación de Leads no deja escapar ningún prospecto. Recoge los datos de formularios, chat y web, enriquece los contactos con información de la empresa y del contexto y avisa al equipo de ventas con una alerta en Slack y el siguiente paso recomendado. Conectado a Slack, HubSpot, Salesforce y Zapier, convierte tus fuentes de leads en un pipeline siempre activo, para que ventas reaccione al momento y ninguna solicitud entrante quede sin respuesta.",
    industry: "Ventas y generación de leads",
    tasks: [
      "Captura de leads",
      "Enriquecimiento de contactos",
      "Aviso al equipo de ventas",
      "Resumen del lead",
    ],
    workflow: [
      "Identifica el lead",
      "Valida los datos",
      "Enriquece el contacto",
      "Avisa a ventas",
    ],
  },
  "support-agent": {
    name: "Agente de Soporte",
    shortName: "Soporte",
    category: "Atención al cliente",
    description:
      "Responde a cada ticket 24/7 y escala solo lo que necesita a una persona.",
    longDescription:
      "El agente de Soporte resuelve los problemas de tus clientes las 24 horas. Entrenado sobre tu base de conocimiento, responde a los tickets en segundos, redacta respuestas precisas, clasifica cada problema y escala al equipo humano solo cuando el caso realmente lo requiere. Conectado a Zendesk, Intercom, Help Scout y Slack, reduce drásticamente el tiempo de primera respuesta y el backlog de tickets, dándote un soporte rápido y constante sin aumentar la plantilla.",
    industry: "Equipos de atención al cliente",
    tasks: [
      "Respuestas 24/7",
      "Clasificación de tickets",
      "Borradores de respuesta",
      "Escalado de casos complejos",
    ],
    workflow: [
      "Lee el ticket",
      "Busca en la base de conocimiento",
      "Redacta la respuesta",
      "Escala si es necesario",
    ],
  },
  copywriter: {
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Diseño y contenido",
    description:
      "Escribe textos que convierten en landing pages, anuncios y emails.",
    longDescription:
      "El agente Copywriter escribe las palabras que convierten visitantes en clientes. Produce copy adaptado a cada plataforma para landing pages, anuncios, emails y UI de producto, con varias variantes listas para los tests A/B. Integrado con Webflow, WordPress, Mailchimp y Notion, elimina la espera del freelance y los briefs: el equipo de marketing tiene copy alineado con la marca en minutos y la variedad de variantes necesaria para optimizar de verdad la conversión.",
    industry: "Equipos de marketing y producto",
    tasks: [
      "Copy para landing pages",
      "Copy para anuncios",
      "Copy para emails",
      "Microcopy de UI",
    ],
    workflow: [
      "Analiza la marca",
      "Define el tono",
      "Redacta las variantes",
      "Entrega para los tests",
    ],
  },
  "finance-manager": {
    name: "Gestor Financiero",
    shortName: "Finanzas",
    category: "E-commerce y finanzas",
    description:
      "Controla facturas, gastos y cash flow sin el caos de las hojas de cálculo.",
    longDescription:
      "El Gestor Financiero mantiene en orden los números de tu empresa. Concilia ingresos y gastos, prepara facturas claras y recordatorios de pago listos para aprobar, y convierte los datos dispersos en un informe de cash flow en lenguaje sencillo: qué ha entrado, qué ha salido, qué vence y qué priorizar. Señala las anomalías en lugar de ocultarlas, se conecta a Stripe, QuickBooks, Google Sheets y Slack, y nunca inventa cifras, para que fundadores y pequeños equipos tengan una visión financiera fiable en minutos en lugar del caos de las hojas de cálculo.",
    industry: "PYME y fundadores",
    tasks: [
      "Facturas y pagos",
      "Seguimiento de gastos",
      "Informe de cash flow",
      "Recordatorios de pago",
    ],
    workflow: [
      "Concilia los datos",
      "Sigue los gastos",
      "Prepara las facturas",
      "Informa del cash flow",
    ],
  },
  "shopify-agent": {
    name: "Agente Shopify",
    shortName: "Shopify",
    category: "E-commerce y finanzas",
    description:
      "Busca productos, crea enlaces al carrito y consulta los pedidos de tu tienda.",
    longDescription:
      "El Agente Shopify gestiona el comercio conversacional de tu tienda. Busca en el catálogo, genera enlaces directos al carrito para variantes concretas, consulta el estado de los pedidos de forma segura con número de pedido y email, e informa de la disponibilidad en segundos. Conectado a tu tienda Shopify, a Stripe, Slack y email, da al comprador la respuesta y el siguiente paso al instante, convirtiendo una pregunta sobre productos en un enlace de compra real en lugar de en una conversación sin salida.",
    industry: "Tiendas Shopify",
    tasks: [
      "Búsqueda de productos",
      "Enlaces al carrito",
      "Estado de pedidos",
      "Seguridad de los datos",
    ],
    workflow: [
      "Analiza los best sellers",
      "Sugiere los productos",
      "Genera el checkout rápido",
      "Envía la confirmación al cliente",
    ],
  },
  // ─── Nuevos agentes del catálogo ampliado (10 disponibles + 5 próximamente) ──
  "quote-agent": {
    name: "Agente de Presupuestos",
    shortName: "Presupuestos",
    category: "E-commerce y finanzas",
    description:
      "Recoge requisitos en el chat, calcula subtotal, IVA y descuentos y envía presupuestos formales por email.",
    longDescription:
      "El Agente de Presupuestos guía a los clientes potenciales en la definición de los servicios solicitados, genera al instante una estimación transparente con el cálculo de impuestos y, a petición del usuario, envía una propuesta formal por email con un resumen adjunto.",
    industry: "PYME, artesanos, talleres y agencias",
    tasks: [
      "Recogida de requisitos del proyecto",
      "Cálculo detallado de subtotal e IVA",
      "Aplicación de descuentos personalizados",
      "Envío del presupuesto formal por email",
    ],
    workflow: [
      "Recoge las partidas",
      "Calcula el total y los impuestos",
      "Muestra la vista previa al cliente",
      "Envía la propuesta por email",
    ],
  },
  "reviews-agent": {
    name: "Agente de Reseñas",
    shortName: "Reseñas",
    category: "Atención al cliente",
    description:
      "Monitoriza las reseñas de Google Business, detecta el sentimiento y responde con mensajes personalizados y empáticos.",
    longDescription:
      "El Agente de Reseñas protege y potencia la reputación de tu negocio en Google Business Profile. Analiza los comentarios de los clientes, detecta las críticas recurrentes y redacta borradores de respuesta amables y precisos, listos para publicar con tu aprobación.",
    industry: "Restaurantes, hoteles, tiendas y negocios locales",
    tasks: [
      "Monitorización de reseñas de Google Business",
      "Análisis del sentimiento del cliente",
      "Borradores de respuesta personalizados",
      "Gestión rápida de críticas",
    ],
    workflow: [
      "Recupera las reseñas nuevas",
      "Analiza el tono y la valoración",
      "Redacta una respuesta profesional",
      "Publica tras la aprobación",
    ],
  },
  "hr-recruiter": {
    name: "Agente de RRHH",
    shortName: "RRHH",
    category: "Negocio y operaciones",
    description:
      "Automatiza la selección de personal: screening de CV, pre-cualificación de candidatos y organización de entrevistas.",
    longDescription:
      "El Agente de RRHH acelera el proceso de contratación de tu empresa. Revisa los currículums recibidos comparándolos con los requisitos del puesto, formula preguntas de pre-cualificación y programa las primeras entrevistas en Calendar.",
    industry: "PYME en crecimiento, agencias y departamentos de RRHH",
    tasks: [
      "Screening automático de CV",
      "Comparación de competencias y descripción del puesto",
      "Comunicación y feedback con candidatos",
      "Programación de entrevistas",
    ],
    workflow: [
      "Recibe las candidaturas",
      "Extrae las competencias clave",
      "Puntúa la adecuación",
      "Programa la primera entrevista",
    ],
  },
  "social-media-agent": {
    name: "Agente de Redes Sociales",
    shortName: "Social Media",
    category: "Diseño y contenido",
    description:
      "Planifica el calendario editorial, crea captions atractivas, sugiere hashtags y analiza tendencias.",
    longDescription:
      "El Agente de Redes Sociales es tu copywriter y planner dedicado para Instagram, LinkedIn, TikTok y Facebook. Propone ideas de posts basadas en las tendencias del momento, escribe textos atractivos con hashtags dirigidos y organiza el plan editorial semanal.",
    industry: "Marcas, tiendas, agencias y creadores de contenido",
    tasks: [
      "Planes editoriales semanales",
      "Copy para posts de Instagram y LinkedIn",
      "Investigación de hashtags y tendencias del sector",
      "Adaptación de formatos por canal",
    ],
    workflow: [
      "Detecta los temas de tendencia",
      "Redacta textos con llamada a la acción",
      "Selecciona los mejores hashtags",
      "Programa en el calendario social",
    ],
  },
  "inventory-logistics": {
    name: "Agente de Inventario y Logística",
    shortName: "Logística",
    category: "E-commerce y finanzas",
    description:
      "Monitoriza el stock del almacén, alerta sobre productos con poco inventario y hace seguimiento de los envíos de proveedores.",
    longDescription:
      "El Agente de Inventario y Logística evita roturas de stock y retrasos en las entregas. Comprueba los niveles de almacén en tiempo real, calcula el mejor momento de reposición y hace seguimiento de los envíos en tránsito, señalando los problemas con antelación.",
    industry: "E-commerce, minoristas y almacenes físicos",
    tasks: [
      "Control de los niveles de stock",
      "Alertas automáticas de stock bajo",
      "Previsión de volúmenes de reposición",
      "Seguimiento del estado de los envíos",
    ],
    workflow: [
      "Comprueba el stock actual",
      "Calcula la velocidad de venta",
      "Alerta sobre artículos críticos",
      "Redacta el pedido al proveedor",
    ],
  },
};