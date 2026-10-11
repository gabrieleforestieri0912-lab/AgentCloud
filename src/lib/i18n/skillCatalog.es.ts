import type { PluginLocalization } from "./skillCatalog";

/** Spanish overlay of the skills catalog (canonical language: Italian). */
export const SKILL_LOCALIZATIONS_ES: Record<string, PluginLocalization> = {
  "ecommerce-operations": {
    name: "Operaciones E-commerce",
    tagline: "Gestiona catálogo, pedidos y almacén",
    description:
      "Suite completa para gestionar las operaciones e-commerce: búsqueda de productos con enlace al carrito, estado del pedido y seguimiento, gestión de descuentos, alertas de stock con previsión de reposición y resumen de ventas.",
    category: "E-commerce",
    agents: {
      "shopify-agent": "Shopify Agent gestiona de forma nativa catálogo y pedidos",
      "inventory-logistics": "Inventory & Logistics gestiona almacén y stock",
      "finance-manager": "Finance Manager analiza las métricas de ventas",
      "reviews-agent": "Reviews & Reputation usa los datos de pedidos para las reseñas",
    },
    integrations: {
      woocommerce: "WooCommerce proporciona catálogo y pedidos",
      shopify: "Shopify gestiona catálogo y pedidos nativos",
      googlesheets: "Sheets sirve como almacén ligero",
      airtable: "Airtable gestiona el inventario",
      slack: "Slack notifica el stock crítico",
      gmail: "Gmail envía las actualizaciones de pedidos",
      paypal: "PayPal procesa los pagos",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión del plugin: 5 competencias operativas (catálogo, seguimiento de pedidos, descuentos, stock, resumen de ventas).",
          "WooCommerce y Google Sheets ya disponibles; Shopify y PayPal indicados como próximamente, nunca obligatorios.",
        ],
      },
    ],
    skills: {
      "catalog-search": {
        name: "Búsqueda en Catálogo",
        description:
          "Busca productos en el catálogo y genera el enlace al carrito. Úsala cuando el cliente pida información sobre productos, disponibilidad o precios.",
        whenNot: [
          "El cliente pregunta por un pedido ya enviado (usa Seguimiento de Pedido)",
          "El catálogo conectado no está disponible: no inventes precios, propone el enlace a la tienda",
        ],
        procedure: [
          "Pide u obtén del contexto: nombre del producto, variante, cantidad, presupuesto",
          "Busca en el catálogo conectado con los términos exactos del cliente",
          "Si hay variantes, propone un máximo de 3 con diferencia de precio clara",
          "Completa el resultado: nombre, SKU, precio, disponibilidad, enlace al carrito",
          "Añade siempre la advertencia: precios y disponibilidad sujetos a verificación en el checkout",
        ],
        rules: [
          "No inventes nunca precios, SKU ni disponibilidad: si falta el dato, dilo",
          "No apliques descuentos: la gestión de descuentos es una competencia aparte con aprobación",
          "Tono: profesional y directo, frases breves",
        ],
        output:
          "Tabla de producto (nombre, SKU, precio, disponibilidad) + enlace al carrito + nota de verificación en checkout",
        example: "Qué necesito para el cumpleaños de Marta, presupuesto 60 euros",
      },
      "order-tracking": {
        name: "Seguimiento de Pedido",
        description:
          "Comprueba el estado de un pedido y proporciona el seguimiento. Úsala para peticiones tipo «dónde está mi pedido» o actualizaciones del envío.",
        whenNot: [
          "No hay pedidos conectados: pide el número de pedido o el email de compra",
          "El cliente pide una devolución o un reembolso (no es seguimiento: deriva a Support Agent)",
        ],
        procedure: [
          "Identifica el pedido: número de pedido, email o nombre + apellidos",
          "Si falta el identificador, pídelo y no continúes",
          "Lee estado, fecha prevista, código de seguimiento y transportista",
          "Indica la fecha prevista de entrega y el último evento de seguimiento",
          "Si la entrega va con retraso, propone la vía de reembolso/reenvío como opción",
        ],
        rules: [
          "No inventes códigos de seguimiento ni fechas de entrega",
          "No prometas reembolsos: propuesta y luego aprobación humana",
          "Datos personales mínimos en el resumen (nombre, ciudad, no dirección completa)",
        ],
        output:
          "Estado del pedido en una línea + tabla de seguimiento (evento, fecha) + fecha prevista de entrega",
        example: "Dónde ha ido a parar mi pedido #1042?",
      },
      "discount-management": {
        name: "Gestión de Descuentos",
        description:
          "Gestiona códigos de descuento y promociones. Úsala ante peticiones de descuento o promociones; requiere aprobación para descuentos superiores al 20%.",
        whenNot: [
          "Descuento solicitado superior al 20%: pasa por aprobación humana",
          "Promoción con impacto en precios de tarifa: no la apliques, avisa al responsable",
        ],
        procedure: [
          "Comprueba el descuento solicitado y su porcentaje",
          "Verifica que no haya promociones ya activas en la misma gama de productos",
          "Si ≤ 20%: aplícalo y comunica código y validez",
          "Si > 20%: prepara el borrador, explica el impacto y pide aprobación",
          "Registra siempre el descuento aplicado con fecha y motivo comercial",
        ],
        rules: [
          "Umbral de aprobación: 20%. Por encima, nunca sin confirmación explícita",
          "No inventes códigos promocionales existentes",
          "No combines códigos si la tienda los excluye (verifica las reglas)",
        ],
        output:
          "Código de descuento + porcentaje + validez + confirmación de aplicación, o solicitud de aprobación",
        example: "El cliente histórico pide el 25%: se lo concedemos?",
      },
      "stock-alert": {
        name: "Alerta de Stock",
        description:
          "Supervisa los niveles de stock y genera previsiones de reposición. Úsala para avisar cuando un producto baja del umbral mínimo.",
        whenNot: [
          "No hay ningún sistema de almacén conectado: usa Sheets/Airtable si están disponibles",
          "Petición de reposición concreta a un proveedor: pasa a Inventory & Logistics",
        ],
        procedure: [
          "Lee los niveles de stock de los productos vendidos en el último periodo",
          "Compara con el umbral mínimo acordado",
          "Calcula la previsión de reposición: venta media diaria × días de cobertura",
          "Señala los productos bajo umbral con fecha estimada de agotamiento",
          "Avisa al equipo (Slack) solo por el stock crítico",
        ],
        rules: [
          "No modifiques los niveles de almacén: esta competencia solo lee y avisa",
          "Estimación explícita: indica siempre el método (media de 30 días)",
          "Umbral mínimo: si no está definido, pregunta antes de notificar",
        ],
        output:
          "Lista de productos bajo umbral: nombre, stock, umbral, agotamiento estimado, cantidad sugerida de reposición",
        example: "Qué está a punto de agotarse? Hazme la lista para la reposición",
      },
      "sales-summary": {
        name: "Resumen de Ventas",
        description:
          "Genera un informe de ventas diario, semanal o mensual con métricas clave y variación sobre el periodo anterior.",
        whenNot: ["Petición de análisis estratégico o de decisiones: usa Informe & Decisiones"],
        procedure: [
          "Determina el periodo (hoy, 7 días, 30 días) y alinea el periodo de comparación",
          "Calcula: pedidos, facturación, ticket medio, tasa de conversión si está disponible",
          "Calcula la variación porcentual sobre el periodo anterior",
          "Destaca los 3 productos y las 3 categorías con la variación más relevante",
          "Cierra con 1-3 acciones sugeridas, no con una lista de números",
        ],
        rules: [
          "Cita siempre el periodo exacto y la fuente de los datos",
          "Ninguna cifra sin calcular: si falta el dato, escribe «no disponible»",
          "No hagas previsiones de facturación sin histórico suficiente",
        ],
        output:
          "Tabla de KPI (periodo actual vs anterior, variación) + 3 destacados + 3 acciones",
        example: "Cuánto hemos vendido esta semana respecto a la anterior?",
      },
    },
  },
  "lead-sales": {
    name: "Leads & Ventas",
    tagline: "Capta, cualifica y convierte leads",
    description:
      "Sistema para la gestión de leads: captación y validación de contactos, enriquecimiento del perfil, puntuación High/Medium/Low, aviso al equipo, secuencia de seguimiento y actualización del pipeline.",
    category: "Ventas",
    agents: {
      "lead-capture": "Lead Capture está dedicado a captar y gestionar leads",
      "crm-agent": "CRM Agent gestiona el pipeline y los leads cualificados",
      "whatsapp-agent": "WhatsApp Agent hace el seguimiento de los leads por chat",
      "calendar-booking": "Calendar Booking cierra el lead con una cita",
    },
    integrations: {
      hubspot: "HubSpot es la fuente de verdad de los contactos",
      slack: "Slack avisa en tiempo real de los leads calientes",
      gmail: "Gmail envía el seguimiento por email",
      googlesheets: "Sheets registra el pipeline de leads",
      googlecalendar: "Calendar reserva las llamadas de seguimiento",
      whatsapp: "WhatsApp hace el seguimiento del lead por chat",
      calendly: "Calendly reserva la reunión",
      mailchimp: "Mailchimp gestiona las campañas de email",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: captación, enriquecimiento, puntuación, aviso al equipo y secuencia de seguimiento.",
          "HubSpot, Slack, Gmail, Sheets y Calendar ya disponibles; WhatsApp, Calendly y Mailchimp próximamente.",
        ],
      },
    ],
    skills: {
      "lead-capture": {
        name: "Captación de Leads",
        description:
          "Capta y valida nuevos leads de varias fuentes. Úsala cuando llegue una petición de contacto, una solicitud de presupuesto o un formulario por rellenar.",
        whenNot: [
          "El contacto ya está en el CRM: actualiza (Enriquecimiento de Perfil), no dupliques",
          "Petición que en realidad es asistencia posventa: pasa a Support Agent",
        ],
        procedure: [
          "Extrae los datos disponibles: nombre, email, teléfono, empresa, fuente",
          "Valida los datos: email formalmente válido, teléfono plausible, código postal coherente",
          "Pide solo los campos que falten, en un único mensaje breve",
          "Registra el lead en el CRM con fuente y fecha",
          "Devuelve la confirmación de captación y el próximo paso",
        ],
        rules: [
          "Consentimiento: registra siempre el origen del dato y la base del consentimiento",
          "No compres ni enriquezcas listas: solo datos facilitados por el contacto",
          "GDPR: retención y bases legales en casos de leads B2B por verificar antes de exportar",
        ],
        output:
          "Ficha de lead (nombre, empresa, email, teléfono, fuente, campos pendientes) + confirmación del CRM",
        example: "Soy Marco Bianchi de Bianchi Srl, quiero un presupuesto para 300 sillas",
      },
      "lead-enrichment": {
        name: "Enriquecimiento de Perfil",
        description:
          "Enriquece el perfil del lead con datos de empresa e historifica las interacciones. Úsala tras la captación para completar la ficha.",
        whenNot: [
          "Datos de empresa no disponibles en las fuentes conectadas: pregunta, no adivines",
          "Petición de scraping masivo: fuera del principio de mínimo privilegio",
        ],
        procedure: [
          "Lee la ficha actual del lead e identifica los campos vacíos",
          "Completa solo con datos presentes en las fuentes conectadas (CRM, Sheets, Notas)",
          "Añade una nota con fecha por cada interacción",
          "Señala los campos aún desconocidos, no los rellenes con suposiciones",
          "Actualiza la ficha del CRM",
        ],
        rules: [
          "Ningún dato inventado: fuentes o «no disponible»",
          "No uses datos personales más allá de lo necesario (nombre, cargo, empresa)",
          "Cada añadido debe tener fecha y fuente",
        ],
        output: "Ficha de lead actualizada + lista de campos aún pendientes + fuentes usadas",
        example: "Completa la ficha de Marco Bianchi con lo que sepas",
      },
      "lead-scoring": {
        name: "Puntuación de Leads",
        description:
          "Asigna una puntuación High/Medium/Low al lead según interacción, presupuesto y plazos. Úsala para decidir prioridades de seguimiento.",
        whenNot: [
          "Sin datos históricos de interacción: asigna «Low (datos insuficientes)»",
          "Decisión comercial definitiva: la puntuación es un apoyo, no un veredicto",
        ],
        procedure: [
          "Recoge las señales: visitas, emails abiertos, peticiones, cargo, tamaño de empresa",
          "Valora tres dimensiones: interacción (actividad), presupuesto (tamaño/preferencias), plazo (urgencia)",
          "Calcula la puntuación 0-100 y el tramo: High 70+, Medium 40-69, Low <40",
          "Enumera las 3 señales que más han pesado, con los motivos",
          "Propone la siguiente acción coherente con el tramo",
        ],
        rules: [
          "La puntuación es una estimación declarada: muestra siempre las señales que la componen",
          "Ningún dato protegido (salud, religión, orientación) entra en la puntuación",
          "Recalcula en cada interacción: la puntuación no es una etiqueta fija",
        ],
        output: "Tramo + puntuación + 3 señales principales + siguiente acción recomendada",
        example: "Cómo clasificamos a Bianchi Srl? Han pedido tres presupuestos",
      },
      "team-notification": {
        name: "Aviso al Equipo",
        description:
          "Avisa al equipo de ventas sobre un lead caliente con resumen y acciones sugeridas. Úsala cuando un lead supera el umbral High.",
        whenNot: [
          "El lead no es High: no molestes al equipo, se lee en el CRM",
          "Canal de Slack no conectado: propone email o aplázalo",
        ],
        procedure: [
          "Verifica que el lead sea High y que el canal esté conectado",
          "Redacta el mensaje en un máximo de 6 líneas: quién, qué pide, valor, acción, plazo",
          "Incluye un enlace directo a la ficha del CRM",
          "Envía el aviso y confirma el envío",
          "Registra el aviso en la ficha del lead",
        ],
        rules: [
          "Ningún dato personal sensible en el mensaje de aviso",
          "No avises más de una vez del mismo lead sin un evento nuevo",
          "El mensaje debe ser autosuficiente: quien solo lea Slack debe entenderlo",
        ],
        output: "Mensaje de aviso enviado (vista previa de 6 líneas) + resultado",
        example: "Avisa al equipo: Bianchi Srl es un lead caliente, presupuesto de 12k",
      },
      "followup-sequence": {
        name: "Secuencia de Seguimiento",
        description:
          "Crea y gestiona secuencias de seguimiento personalizadas según la puntuación del lead. Úsala para cerrar negociaciones pendientes.",
        whenNot: [
          "El lead ha respondido o ha dicho «no interesado»: interrumpe la secuencia",
          "Secuencia de más de 5 emails: requiere aprobación explícita",
        ],
        procedure: [
          "Verifica el estado de la negociación y el último contacto",
          "Define los pasos: canal, asunto, fecha, objetivo de cada paso",
          "Escribe cada email breve (máx. 120 palabras), tono de la empresa, un solo CTA",
          "Programa la secuencia y registra la planificación en la ficha",
          "Cada respuesta del lead interrumpe automáticamente los pasos siguientes",
        ],
        rules: [
          "Máximo 5 emails por secuencia, distancia mínima de 2 días",
          "Opt-out siempre presente («si no quieres seguir recibiendo, responde CANCELAR»)",
          "Ninguna promesa comercial no confirmada internamente",
        ],
        output:
          "Tabla de secuencia (paso, fecha, canal, asunto del email, objetivo) + textos en borrador",
        example: "Prepara el seguimiento para Bianchi: no responde desde hace 9 días",
      },
    },
  },
  "support-reputation": {
    name: "Asistencia & Reputación",
    tagline: "Soporte al cliente y gestión de reseñas",
    description:
      "Suite para el servicio al cliente: respuesta desde la base de conocimiento con escalado, clasificación de la urgencia de los tickets, borrador de respuesta a reseñas con análisis de sentimiento, gestión de reclamaciones y tono de voz de la marca.",
    category: "Soporte",
    agents: {
      "support-agent": "Support Agent gestiona tickets y base de conocimiento",
      "reviews-agent": "Reviews & Reputation gestiona reseñas y reputación",
      "whatsapp-agent": "WhatsApp Agent atiende a los clientes por chat",
      "email-manager": "Email Manager gestiona los tickets por email",
    },
    integrations: {
      slack: "Slack gestiona el escalado humano",
      notion: "Notion es la base de conocimiento (RAG)",
      googledrive: "Drive aloja los documentos de la base de conocimiento",
      gmail: "Gmail gestiona los tickets por email",
      googlesheets: "Sheets registra tickets y SLA",
      zendesk: "Zendesk gestiona los tickets avanzados",
      whatsapp: "WhatsApp atiende a los clientes por chat",
      googlechat: "Google Chat gestiona el soporte interno",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: respuesta desde base de conocimiento, urgencia de tickets, borrador de reseñas y gestión de reclamaciones.",
          "La gestión de reclamaciones es de alto riesgo: cada solución propuesta requiere aprobación antes del envío.",
        ],
      },
    ],
    skills: {
      "kb-response": {
        name: "Respuesta desde Base de Conocimiento",
        description:
          "Responde a las preguntas de los clientes basándose en la base de conocimiento de la empresa. Úsala cuando la pregunta tenga una respuesta documentada; escala si hay duda.",
        whenNot: [
          "La base de conocimiento no contiene la respuesta: escala, no improvises",
          "Petición legal, médica o de seguridad: escalado inmediato a un humano",
        ],
        procedure: [
          "Busca en la base de conocimiento (Notion/Drive) los documentos pertinentes",
          "Verifica que el documento cubra de verdad el caso del cliente",
          "Responde en lenguaje sencillo, con los pasos numerados",
          "Cita la fuente del documento usado",
          "Si la cobertura es parcial, dilo y propone el escalado",
        ],
        rules: [
          "No inventes nunca un procedimiento: si no está documentado, no existe",
          "Tono: empático y concreto, máximo 150 palabras",
          "No compartas nunca documentos internos sensibles con el cliente: solo la respuesta",
        ],
        output:
          "Respuesta al cliente (máx. 150 palabras) + documento fuente + resultado de la búsqueda (completa/parcial)",
        example: "Cómo se sustituye un filtro del aire acondicionado?",
      },
      "ticket-urgency": {
        name: "Clasificación de Urgencia",
        description:
          "Clasifica los tickets por urgencia (critical, high, medium, low) según SLA e impacto en el cliente. Úsala con cada ticket nuevo.",
        whenNot: [
          "El ticket trata de datos personales borrados o violaciones de seguridad: siempre critical",
          "No está claro si el cliente es de pago: pregunta antes de clasificar",
        ],
        procedure: [
          "Lee el ticket e identifica impacto, cliente y SLA aplicable",
          "Clasifica: critical (servicio parado/seguridad/SLA roto), high (bloqueo operativo), medium (petición con alternativa), low (información)",
          "Asigna la primera respuesta esperada según el SLA",
          "Indica el motivo en una línea",
          "Para critical y high, avisa enseguida al equipo",
        ],
        rules: [
          "Los SLA son los de la empresa: si no están definidos, decláralo y usa el valor por defecto",
          "No cierres nunca un ticket critical sin resolución verificada",
          "La clasificación no es definitiva: puede revisarse con el cliente",
        ],
        output: "Ticket + tramo de urgencia + SLA de primera respuesta + motivo + aviso (si es alta)",
        example: "Tengo 12 tickets abiertos desde ayer, dime cuáles gestionamos primero",
      },
      "review-draft": {
        name: "Borrador de Reseña",
        description:
          "Genera el borrador de respuesta a una reseña analizando el sentimiento. Úsala para responder a reseñas positivas o negativas.",
        whenNot: [
          "Reseña que acusa sobre datos personales o fraude: escalado antes de responder",
          "Petición de reseña falsa o de eliminación injustificada: nunca",
        ],
        procedure: [
          "Analiza el sentimiento: positivo, neutro, negativo (y la gravedad si es negativo)",
          "Para positivo: agradece por su nombre e invita a repetir la compra",
          "Para negativo: reconoce el problema, pide disculpas sin culpar, propone el contacto directo, no discutas en público",
          "Mantén el tono de voz de la marca y no cites datos personales del cliente",
          "Prepara el borrador: la publicación sigue siendo una acción que requiere aprobación",
        ],
        rules: [
          "No respondas nunca de forma defensiva ni sarcástica",
          "Máximo 100 palabras, sin promesas económicas",
          "Ningún dato personal más allá del nombre ya publicado",
        ],
        output: "Borrador de respuesta + sentimiento detectado + posible aviso de escalado",
        example: "Esta reseña es negativa sobre la entrega, respondemos?",
      },
      "complaint-handling": {
        name: "Gestión de Reclamaciones",
        description:
          "Gestiona las reclamaciones con procedimiento estándar, verifica la viabilidad de la solución y mantiene el registro. Úsala con reclamaciones formales.",
        whenNot: [
          "Reclamación que requiere reembolso o penalización: propuesta y aprobación humana obligatorias",
          "Reclamación con datos personales: verifica el GDPR antes de compartir cualquier documento",
        ],
        procedure: [
          "Recoge los hechos: qué pasó, cuándo, qué pedido, qué impacto",
          "Verifica la viabilidad de la solución con los datos reales (pedidos, envíos, políticas)",
          "Propone la solución: una sola, concreta, con plazos",
          "Registra la reclamación con resultado y fecha de cierre",
          "Si el envío de la respuesta contiene compromisos o reembolsos, pide aprobación",
        ],
        rules: [
          "Acción de alto riesgo: la respuesta a la reclamación requiere aprobación antes del envío",
          "Reconocer un error es obligación de buena fe: no niegues la evidencia",
          "No ofrezcas compensaciones no previstas en la política de la empresa",
        ],
        output:
          "Registro de reclamación (hechos, solución propuesta, plazos, resultado) + borrador de respuesta pendiente de aprobación",
        example: "Cliente reclama pedido #331: llegó roto y sin respuesta desde hace 5 días",
      },
    },
  },
  "bookings-calendar": {
    name: "Reservas & Agenda",
    tagline: "Gestiona citas y calendario",
    description:
      "Sistema para la gestión de la agenda: comprobación de disponibilidad y propuesta de huecos, reserva con enlace de vídeo, recordatorios y gestión de no-shows, reprogramaciones y cancelaciones, planificación del día y bloques de trabajo profundo.",
    category: "Productividad",
    agents: {
      "calendar-booking": "Calendar Booking gestiona citas y disponibilidad",
      "personal-assistant": "Personal Assistant planifica agenda y tareas",
      "hr-recruiter": "HR & Recruiter planifica las entrevistas",
      "whatsapp-agent": "WhatsApp Agent confirma las citas por chat",
    },
    integrations: {
      googlecalendar: "Calendar es imprescindible para las reservas",
      gmail: "Gmail envía confirmaciones y recordatorios",
      notion: "Notion guarda notas de reuniones y tareas",
      googlemeet: "Google Meet genera el enlace de vídeo",
      microsoftoutlook: "Outlook amplía la cobertura del calendario",
      calendly: "Calendly simplifica la reserva",
      googletasks: "Google Tasks sincroniza las tareas",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: disponibilidad, reserva, recordatorios de no-show, reprogramación y planificación del día.",
          "Google Calendar y Gmail ya disponibles; Google Meet, Outlook, Calendly y Tasks próximamente.",
        ],
      },
    ],
    skills: {
      "availability-check": {
        name: "Comprobación de Disponibilidad",
        description:
          "Comprueba la disponibilidad del calendario y propone huecos óptimos respetando las preferencias. Úsala al inicio de cada petición de cita.",
        whenNot: [
          "Petición urgente para hoy mismo: propone igualmente, señalando los límites",
          "El calendario no está conectado: propone los horarios y pide confirmación manual",
        ],
        procedure: [
          "Lee los compromisos del periodo solicitado",
          "Aplica los límites: horario laboral, duración mínima, pausas, huso horario del cliente",
          "Propone un máximo de 3 huecos, con fecha, hora y duración explícitas",
          "Indica el huso horario de cada hueco",
          "Pregunta cuál prefiere; no reserves todavía",
        ],
        rules: [
          "Muestra siempre el huso horario: los errores de huso son la causa n.º 1 de no-shows",
          "Máximo 3 propuestas, no un menú infinito",
          "No propongas huecos fuera del horario laboral sin señalarlo",
        ],
        output: "Lista de un máximo de 3 huecos (fecha, hora, duración, huso) + duración estándar del servicio",
        example: "Quiero una llamada el jueves, duración 45 minutos",
      },
      "booking-creation": {
        name: "Creación de Reserva",
        description:
          "Crea la cita en el calendario con enlace de vídeo y envía la confirmación. Úsala después de que el cliente haya elegido el hueco.",
        whenNot: [
          "Hueco aún no confirmado por el cliente: no crees el evento",
          "Petición de modificar una cita existente: usa Reprogramación/Cancelación",
        ],
        procedure: [
          "Verifica que el hueco siga libre antes de escribirlo",
          "Crea el evento con título comprensible, horario, duración, participantes",
          "Añade el enlace de vídeo si la integración está conectada; si no, indícalo como pendiente",
          "Envía la confirmación con: fecha, hora, huso, enlace, qué llevar",
          "Registra el evento para los recordatorios",
        ],
        rules: [
          "Título del evento legible para el cliente, no códigos internos",
          "Confirma siempre en los 2 minutos siguientes a la confirmación del cliente",
          "No compartas los datos de otros participantes",
        ],
        output:
          "Cita creada (fecha, hora, duración, enlace de vídeo) + confirmación enviada + estado del recordatorio",
        example: "Perfecto, el jueves a las 15:00 me va bien",
      },
      "reminder-no-show": {
        name: "Recordatorio de No-show",
        description:
          "Gestiona los recordatorios previos a la cita y el seguimiento en caso de no-show. Úsala para todas las citas confirmadas.",
        whenNot: [
          "Cita aún no confirmada: sin recordatorios",
          "Recordatorio ya enviado: no lo dupliques",
        ],
        procedure: [
          "Prepara el recordatorio: fecha, hora, huso, enlace, objetivo en 2 líneas",
          "Envía 24 h antes; si la petición es dentro de 24 h, envíalo enseguida",
          "Si la cita pasa sin asistencia, envía un seguimiento amable en 2 horas",
          "Propone una nueva fecha con 2 huecos alternativos",
          "Registra el evento (recordatorio enviado / no-show)",
        ],
        rules: [
          "Un solo recordatorio por cita, 24 h antes",
          "Tono del seguimiento: sin reproches, máximo 2 líneas",
          "No deduzcas ausencias definitivas por un retraso de pocos minutos",
        ],
        output: "Recordatorio enviado (hora) o seguimiento de no-show (hora) + 2 huecos alternativos",
        example: "El cliente de las 15 no se ha conectado, qué le escribimos?",
      },
      "reschedule-cancel": {
        name: "Reprogramación/Cancelación",
        description:
          "Gestiona peticiones de cambio o cancelación aplicando las políticas de la empresa. Úsala cuando un cliente pida mover o anular.",
        whenNot: [
          "Cancelación con penalización fuera de la política: propuesta y aprobación humana",
          "Petición de terceros para una cita de otros: verificar que estén autorizados",
        ],
        procedure: [
          "Lee la cita y la política de la empresa (p. ej. 24 h de preaviso)",
          "Verifica si la petición respeta los términos: sin penalización o con penalización aplicable",
          "Si es un cambio, propone 2 huecos con la misma lógica de Comprobación de Disponibilidad",
          "Actualiza o cancela el evento",
          "Envía la confirmación con la nueva fecha o con la cancelación y las posibles penalizaciones",
        ],
        rules: [
          "Las penalizaciones se citan de la política escrita: nunca improvisadas",
          "Cancelación fuera de umbral: siempre confirmación humana",
          "Avisa a las partes internas solo si la política lo prevé",
        ],
        output:
          "Resultado (movida/cancelada) + nueva fecha si se reprogramó + penalización aplicada (si hay) + confirmación enviada",
        example: "Tengo que mover la cita del martes al jueves",
      },
      "day-planning": {
        name: "Planificación del Día",
        description:
          "Organiza el día con bloques de trabajo profundo y gestiona las prioridades. Úsala por la mañana o ante una petición de plan diario.",
        whenNot: [
          "Día ya lleno de compromisos fijos: propone igualmente, moviendo solo lo flexible",
          "Petición de prioridades de semana/sprint: usa Proyectos & Tareas",
        ],
        procedure: [
          "Lee los compromisos fijos del día",
          "Identifica 2-3 tareas de alta prioridad e importancia estratégica",
          "Propone 1-2 bloques de trabajo profundo de 90 minutos en franjas libres",
          "Inserta pausas de 15 minutos entre bloques",
          "Cierra con la lista de lo que NO harán hoy, para evitar la culpabilidad",
        ],
        rules: [
          "Máximo 3 tareas «del día»: la lista larga solo genera ansiedad",
          "Trabajo profundo ≥ 60 minutos: por debajo no es trabajo profundo",
          "No muevas nunca reuniones con otros sin decir que lo haces",
        ],
        output:
          "Plan del día: tareas del día (3) + bloques de trabajo profundo con horario + qué queda en la lista",
        example: "Organiza mi día del jueves",
      },
    },
  },
  "quotes-finance": {
    name: "Presupuestos & Finanzas",
    tagline: "Genera presupuestos y gestiona la contabilidad",
    description:
      "Suite financiera: recogida de requisitos y cálculo del presupuesto con IVA, generación del documento formal, conciliación de ingresos y gastos, calendario fiscal con avisos y extracción de datos de facturas.",
    category: "Finanzas",
    agents: {
      "quote-agent": "Quotes & Estimates genera presupuestos profesionales",
      "finance-manager": "Finance Manager gestiona contabilidad y facturas",
      "invoice-agent": "Invoice Agent gestiona la facturación",
      "business-manager": "Business Manager analiza las métricas financieras",
    },
    integrations: {
      gmail: "Gmail envía presupuestos y avisos",
      googlesheets: "Sheets lleva el calendario fiscal",
      microsoftexcel: "Excel crea los documentos financieros",
      microsoftword: "Word genera los documentos formales",
      googledrive: "Drive aloja los documentos fiscales",
      paypal: "PayPal procesa los pagos",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: cálculo de presupuesto con IVA 22%, documento formal, conciliación y calendario fiscal.",
          "Conciliación y avisos son de alto riesgo: los registros y envíos piden aprobación.",
        ],
      },
    ],
    skills: {
      "quote-calculation": {
        name: "Cálculo de Presupuesto",
        description:
          "Recoge los requisitos y calcula el presupuesto con base imponible, IVA 22% y descuentos. Úsala cuando el cliente pida un presupuesto.",
        whenNot: [
          "Presupuestos con tipo de IVA distinto: pregunta y usa el tipo indicado",
          "Tarifa de precios no disponible: pide los precios, no los inventes",
        ],
        procedure: [
          "Recoge los requisitos: qué hace falta, cantidades, plazos, necesidades especiales",
          "Aplica los precios de tarifa a las líneas, una línea por concepto",
          "Calcula base = Σ líneas − descuentos; IVA = base × 22%; total = base + IVA",
          "Muestra cada línea con cantidad, precio unitario, importe e IVA",
          "Indica la validez del presupuesto (por defecto 30 días) y las condiciones de pago",
        ],
        rules: [
          "IVA: usa el tipo correcto (por defecto 22%) y muéstralo en claro",
          "Redondea a 2 decimales, nunca al azar",
          "Ningún coste no presupuestado: los extras se dicen enseguida",
        ],
        output:
          "Tabla de líneas + base imponible, IVA 22%, total; condiciones de pago y validez",
        example: "Presupuesto para 300 sillas, 12 mesas y montaje, entrega en Milán",
      },
      "document-generation": {
        name: "Generación de Documento",
        description:
          "Genera el documento formal (Word/PDF) a partir de la plantilla de la empresa. Úsala tras el cálculo del presupuesto.",
        whenNot: [
          "Documento con datos fiscales sin verificar: bloquea y pide confirmación",
          "Envío del documento al cliente: acción de alto riesgo, requiere aprobación",
        ],
        procedure: [
          "Toma el último presupuesto calculado y los datos del cliente",
          "Rellena la plantilla de la empresa: cabecera, cliente, líneas, totales, condiciones",
          "Verifica los campos obligatorios: razón social, NIF/CIF, fecha, firmas",
          "Genera el documento e indica el nombre del archivo",
          "El envío sigue siendo una acción que requiere aprobación humana",
        ],
        rules: [
          "NIF y código fiscal obligatorios: sin datos fiscales completos no se genera el documento",
          "No insertes datos bancarios si no están en la plantilla",
          "Nombre de archivo: `presupuesto-<cliente>-<fecha>.docx`",
        ],
        output:
          "Documento generado (nombre de archivo) + lista de campos verificados + estado del envío (pendiente de aprobación)",
        example: "Genera el documento del presupuesto para Bianchi Srl",
      },
      "reconciliation": {
        name: "Conciliación",
        description:
          "Concilia ingresos y gastos comparando facturas y movimientos bancarios. Úsala a final de mes o ante una petición de cuadratura.",
        whenNot: [
          "Movimientos bancarios no accesibles: la conciliación se hace a mano",
          "Datos fiscales en escritura: esta competencia solo señala, no registra",
        ],
        procedure: [
          "Carga el extracto del periodo y la lista de facturas",
          "Cruza por importe, fecha y concepto; marca las coincidencias seguras",
          "Enumera los no cruzados en dos grupos: pendientes y duplicados",
          "Para cada no cruzado indica la hipótesis más probable y qué hace falta para confirmarla",
          "Propone los asientos, sin aplicarlos",
        ],
        rules: [
          "Acción de alto riesgo: ningún asiento contable sin aprobación",
          "No modifiques nunca los datos de origen (facturas o extracto)",
          "Cada propuesta debe citar al menos dos datos que la sostengan",
        ],
        output:
          "Resumen: cruzados (recuento y total), pendientes, duplicados, propuestas de asiento por aprobar",
        example: "Conciliemos el mes de septiembre",
      },
      "fiscal-deadlines": {
        name: "Calendario Fiscal",
        description:
          "Gestiona los vencimientos fiscales y prepara los avisos. Úsala para el seguimiento periódico de vencimientos.",
        whenNot: [
          "Avisos automáticos a clientes: requieren aprobación, siempre",
          "Declaraciones o trámites fiscales: esta competencia registra, no calcula",
        ],
        procedure: [
          "Enumera los vencimientos del periodo con importe, cliente y fecha",
          "Separa: vencidos, que vencen en los próximos 7 días, posteriores",
          "Para los vencidos, prepara el borrador del aviso (máx. 100 palabras, tono cordial pero firme)",
          "Señala los vencimientos fiscales internos con días de antelación",
          "Cada aviso queda pendiente de aprobación antes del envío",
        ],
        rules: [
          "Envío de avisos = acción de alto riesgo: nunca sin aprobación",
          "Ningún dato fiscal calculado por esta competencia: se registra y se señala",
          "Cita el vencimiento con fecha e importe exactos",
        ],
        output:
          "Calendario: vencidos / próximos 7 días / posteriores + borradores de aviso pendientes de aprobación",
        example: "Qué facturas están vencidas y a quién escribo?",
      },
    },
  },
  "content-seo": {
    name: "Contenidos & SEO",
    tagline: "Crea contenidos optimizados para SEO",
    description:
      "Herramienta para el marketing de contenidos: búsqueda de palabras clave con intención de búsqueda, análisis de contenidos de la competencia, artículos SEO estructurados, textos para landing y anuncios con variantes A/B, secuencias de email y newsletter.",
    category: "Marketing",
    agents: {
      "seo-agent": "SEO Content Agent optimiza los contenidos para la búsqueda",
      copywriter: "Copywriter crea textos persuasivos",
      "social-media-agent": "Social Media usa los contenidos para las publicaciones",
      "research-agent": "Research Agent aporta los datos para los contenidos",
    },
    integrations: {
      notion: "Notion para borradores y revisión de contenidos",
      googlesheets: "Sheets para el plan editorial y las palabras clave",
      microsoftword: "Word para las revisiones finales",
      googledrive: "Drive aloja los contenidos",
      googleanalytics: "Analytics mide el rendimiento de los contenidos",
      googledocs: "Docs para la colaboración en contenidos",
      mailchimp: "Mailchimp gestiona las campañas",
      googleads: "Google Ads mide el rendimiento de los anuncios",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: búsqueda de palabras clave, análisis de competencia, artículo SEO y textos para anuncios con variantes A/B.",
          "Notion, Sheets, Word y Drive ya disponibles; Analytics, Docs, Mailchimp y Ads próximamente.",
        ],
      },
    ],
    skills: {
      "keyword-research": {
        name: "Búsqueda de Palabras Clave",
        description:
          "Busca palabras clave con análisis de volumen, dificultad e intención de búsqueda. Úsala antes de escribir cualquier contenido SEO.",
        whenNot: [
          "Sin fuente de datos SEO conectada: propone palabras clave por razonamiento y decláralo",
          "Tema no pertinente para el negocio: señálalo y propone alternativas",
        ],
        procedure: [
          "Recoge el tema, el público y el objetivo del contenido",
          "Obtén palabras clave long-tail ligadas a la intención real (informativa, comercial, transaccional)",
          "Agrupa por intención y por dificultad",
          "Selecciona 1 palabra clave principal y 5-8 secundarias",
          "Indica la fuente de cada dato: si es una estimación, dilo",
        ],
        rules: [
          "Ningún volumen de búsqueda inventado: si no está disponible, se indica «por verificar»",
          "Prioridad a la palabra clave long-tail de baja dificultad para las pymes",
          "Sin relleno de palabras clave: la densidad natural está bien",
        ],
        output: "Tabla de palabras clave (palabra clave, intención, dificultad, rol) + palabra clave principal recomendada",
        example: "Qué palabra clave enseño para «cómo elegir sillas de oficina»?",
      },
      "competitor-analysis": {
        name: "Análisis de Competencia",
        description:
          "Analiza los contenidos de la competencia para detectar huecos y oportunidades. Úsala antes de definir el plan editorial.",
        whenNot: [
          "Competidores no identificados: pide los nombres, no los adivines",
          "Petición de copia literal: nunca, solo análisis estructural",
        ],
        procedure: [
          "Enumera los competidores facilitados o ya conocidos",
          "Para cada uno: temas cubiertos, formato de los contenidos, longitud, tono",
          "Detecta los huecos: preguntas sin respuesta, formatos ausentes, ángulos no cubiertos",
          "Propone 3 ángulos de contenido no cubiertos por nadie",
          "Indica siempre las fuentes (URL) usadas",
        ],
        rules: [
          "Ninguna reproducción de textos ajenos: solo análisis",
          "Cada afirmación sobre competidores lleva la URL",
          "No se atribuyen volúmenes de tráfico si no están disponibles",
        ],
        output:
          "Tabla de competidores (temas, formatos, huecos) + 3 ángulos propuestos + fuentes",
        example: "Analiza los contenidos de mis 3 competidores principales",
      },
      "seo-article": {
        name: "Artículo SEO",
        description:
          "Genera un artículo SEO estructurado con encabezados, meta description y optimización on-page. Úsala cuando la palabra clave ya esté definida.",
        whenNot: [
          "Palabra clave aún no definida: pasa por Búsqueda de Palabras Clave",
          "Artículo que requiere datos propios no disponibles: señálalo",
        ],
        procedure: [
          "Toma la palabra clave principal y el público de referencia",
          "Estructura: un solo H1, H2/H3 lógicos, respuesta a la pregunta en las primeras 100 palabras",
          "Escribe 800-1500 palabras, párrafos breves, listas donde convengan",
          "Añade meta title (máx. 60 caracteres) y meta description (máx. 155)",
          "Inserta 2-3 enlaces internos sugeridos y las FAQ",
        ],
        rules: [
          "Un solo H1, meta title ≤ 60 caracteres, meta description ≤ 155",
          "Ningún hecho o dato inventado: los números vienen de las fuentes",
          "Español claro, frases breves, sin jerga del sector",
        ],
        output:
          "Artículo completo con estructura de encabezados + meta title + meta description + enlaces internos sugeridos",
        example: "Escribe el artículo sobre «cómo elegir sillas de oficina»",
      },
      "copy-ads": {
        name: "Textos para Anuncios",
        description:
          "Crea textos para landing pages y anuncios con variantes de test A/B. Úsala para campañas y páginas de destino.",
        whenNot: [
          "Afirmaciones reguladas (salud, finanzas): las declaraciones deben verificarse",
          "Texto sin oferta clara: primero define qué se vende y a qué precio",
        ],
        procedure: [
          "Pide objetivo, oferta, público y tono de voz",
          "Escribe headline 3 variantes (máx. 8 palabras), subheadline 3 variantes, CTA 3 variantes",
          "Indica qué variante es para A, B, C y por qué",
          "Añade la prueba social solo si existe un dato real",
          "Cierra con el texto completo de cada variante montada",
        ],
        rules: [
          "Las variantes deben cambiar el ángulo, no solo los sinónimos",
          "Ninguna promesa insostenible («garantía al 100%»)",
          "CTA única y repetible por cada variante",
        ],
        output:
          "3 variantes completas (headline, subheadline, CTA, ángulo) con textos montados",
        example: "Escribe el texto para la landing de nuestro servicio de limpieza",
      },
    },
  },
  "social-media": {
    name: "Redes Sociales",
    tagline: "Gestiona la presencia en redes",
    description:
      "Suite de redes sociales: calendario editorial semanal, textos por canal (Instagram, LinkedIn, TikTok, Facebook), búsqueda de hashtags y tendencias, reutilización de un contenido en varios canales e informe de rendimiento.",
    category: "Marketing",
    agents: {
      "social-media-agent": "Social Media gestiona la presencia en redes",
      copywriter: "Copywriter crea captions y textos",
      "reviews-agent": "Reviews & Reputation gestiona las reseñas sociales",
    },
    integrations: {
      googlesheets: "Sheets para el calendario editorial",
      notion: "Notion para los borradores de contenidos",
      googledrive: "Drive aloja los assets y contenidos",
      slack: "Slack avisa al equipo para la aprobación",
      instagram: "Instagram para la publicación directa",
      facebook: "Facebook para la publicación directa",
      tiktok: "TikTok para la publicación directa",
      figma: "Figma para los creativos sociales",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: calendario editorial, captions por canal, hashtags, reutilización de contenidos e informe de rendimiento.",
          "Mientras los canales no sean conectables, las competencias producen planes y textos exportables a Sheets y Notion.",
        ],
      },
    ],
    skills: {
      "editorial-calendar": {
        name: "Calendario Editorial",
        description:
          "Planifica el calendario editorial semanal con temas, formatos y plazos. Úsala al inicio de la semana.",
        whenNot: [
          "No está claro el tono de voz de la marca: pregunta antes de planificar",
          "Petición de un plan anual: avanza por trimestres, con prioridades",
        ],
        procedure: [
          "Recoge los objetivos del mes (visibilidad, leads, ventas) y las promociones en curso",
          "Distribuye las publicaciones: 60% educación, 30% prueba social, 10% promoción",
          "Asigna formato y canal a cada publicación",
          "Define un plazo interno de 2 días para la aprobación",
          "Exporta el plan a Sheets con responsable y estado",
        ],
        rules: [
          "Máximo 3 publicaciones por semana y canal: calidad, no cantidad",
          "Cada publicación tiene un objetivo único y declarado",
          "Ninguna publicación sin aprobación (estado «pendiente»)",
        ],
        output:
          "Tabla del plan semanal (día, canal, formato, tema, objetivo, estado, plazo)",
        example: "Prepara el plan editorial de esta semana",
      },
      "caption-generation": {
        name: "Generación de Captions",
        description:
          "Genera captions optimizadas para Instagram, LinkedIn, TikTok y Facebook. Úsala para escribir el texto de una publicación ya planificada.",
        whenNot: [
          "Contenidos que requieren datos no disponibles (números, fechas): señálalos",
          "Petición de moderación o de respuestas a comentarios negativos: pasa a Soporte",
        ],
        procedure: [
          "Adapta el tono al canal: profesional para LinkedIn, informal para Instagram/TikTok",
          "Primera línea = gancho (máx. 125 caracteres, también con emoji si el tono lo prevé)",
          "Desarrolla en 3-6 líneas breves",
          "Cierra con un solo CTA",
          "Adapta la longitud al canal (TikTok e Instagram breves, LinkedIn más discursivo)",
        ],
        rules: [
          "Sin etiquetas ni hashtags no pertinentes: el comentario no es una lista",
          "Ninguna promesa no verificable",
          "Tono de la marca, nunca «palabra spam» ni excesivamente formal",
        ],
        output: "Caption para el canal solicitado (gancho, cuerpo, CTA) + longitud sugerida",
        example: "Escribe la caption para la publicación de LinkedIn de hoy",
      },
      "hashtag-research": {
        name: "Búsqueda de Hashtags",
        description:
          "Busca hashtags y tendencias por plataforma con análisis de interacción. Úsala antes de la publicación.",
        whenNot: [
          "Hashtags prohibidos por la plataforma: nunca, aunque rindan",
          "Sin datos de tendencias disponibles: se señala, no se inventa",
        ],
        procedure: [
          "Separa los hashtags por rol: sector (5-8), locales (3-5), de marca (2-3)",
          "Para los hashtags locales usa el nombre de la ciudad o del barrio",
          "Selecciona 10-15 hashtags para Instagram, 3-5 para TikTok, 2-3 para LinkedIn",
          "Elimina los hashtags con tendencia negativa o no pertinentes",
          "Anota la motivación de cada grupo",
        ],
        rules: [
          "Máximo 15 hashtags: más es spam",
          "Ningún hashtag que pueda leerse como ofensa o prejuicio",
          "Los hashtags de marca deben verificarse en la política de la marca",
        ],
        output: "Lista de hashtags por grupo (sector, locales, de marca) con recuento y motivación",
        example: "Qué hashtags usamos para nuestro restaurante en Bolonia?",
      },
      "content-repurposing": {
        name: "Reutilización de Contenidos",
        description:
          "Adapta un contenido existente a varios canales manteniendo la coherencia de tono. Úsala para aprovechar al máximo un contenido ya producido.",
        whenNot: [
          "Contenido original no disponible: pídelo, no lo recrees desde cero",
          "Contenido por adaptar con datos temporales: actualiza siempre las fechas",
        ],
        procedure: [
          "Lee el contenido original y extrae los 3 mensajes clave",
          "Decide el enfoque por canal: un mensaje por canal, nunca copiar-pegar",
          "Adapta formato (vídeo, carrusel, texto) y longitud",
          "Reajusta los hashtags al canal",
          "Entrega 3 versiones listas para aprobación",
        ],
        rules: [
          "Ningún contenido idéntico en dos canales",
          "Actualiza siempre fechas, números y referencias antes de reutilizar",
          "Cada versión mantiene el tono de la marca",
        ],
        output: "3 versiones adaptadas por canal (formato, longitud, texto, hashtags)",
        example: "Toma el artículo SEO del mes pasado y saca 3 publicaciones",
      },
      "social-performance-report": {
        name: "Informe de Rendimiento",
        description:
          "Genera el informe de rendimiento de los canales sociales con tendencias y acciones. Úsala a final de mes o de semana.",
        whenNot: [
          "Canales no publicados directamente: el informe se basa en datos manuales",
          "Datos no disponibles: no extrapoles tendencias de una sola publicación",
        ],
        procedure: [
          "Recoge los datos por canal: alcance, interacción, visitas, seguidores",
          "Calcula la tasa de interacción = interacciones / alcance",
          "Compara con el periodo anterior y con la referencia del sector",
          "Destaca los 2 mejores y los 2 peores contenidos con las hipótesis",
          "Propone 2 acciones para el mes siguiente",
        ],
        rules: [
          "Ningún dato agregado sin fuente y periodo",
          "La referencia del sector, si no está disponible, se declara «no disponible»",
          "El informe no juzga a los empleados: mira los contenidos",
        ],
        output:
          "Tabla de KPI por canal + comparación de periodo + 2 destacados + 2 acciones",
        example: "Cómo han ido las redes este mes?",
      },
    },
  },
  "inbox-productivity": {
    name: "Inbox & Productividad",
    tagline: "Clasificación de emails y gestión de tareas",
    description:
      "Sistema de productividad: clasificación de emails por prioridad, borradores de respuesta, seguimiento de vencimientos y compromisos, resumen diario, actas de reunión y método inbox cero.",
    category: "Productividad",
    agents: {
      "email-manager": "Email Manager gestiona la bandeja y los emails",
      "email-agent": "Email Agent clasifica y responde emails",
      "personal-assistant": "Personal Assistant gestiona la productividad",
      "business-manager": "Business Manager usa los resúmenes de productividad",
    },
    integrations: {
      gmail: "Gmail es la fuente principal de email",
      googlecalendar: "Calendar registra vencimientos y compromisos",
      notion: "Notion aloja notas y tareas",
      microsoftonenote: "OneNote aloja notas y documentos",
      microsoftoutlook: "Outlook amplía la cobertura de email",
      googletasks: "Google Tasks gestiona las tareas",
      googlekeep: "Google Keep aloja notas rápidas",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: clasificación de emails, borrador de respuesta, vencimientos, actas de reunión y método inbox cero.",
          "Gmail, Calendar, Notion y OneNote ya disponibles; Outlook, Tasks y Keep próximamente.",
        ],
      },
    ],
    skills: {
      "email-triage": {
        name: "Clasificación de Emails",
        description:
          "Clasifica los emails por prioridad (urgent, important, normal) según contenido, remitente y vencimientos. Úsala al inicio del día.",
        whenNot: [
          "Buzones de otros usuarios: nunca, solo el buzón autorizado",
          "Emails de direcciones desconocidas con peticiones de pago: verifica siempre",
        ],
        procedure: [
          "Lee los emails no leídos de los últimos 3 días",
          "Clasifica: urgent (en 24 h o bloqueo operativo), important (en la semana), normal (informativos)",
          "Señala los emails que contengan peticiones de pago o datos sensibles",
          "Propone etiquetas/carpetas para cada grupo",
          "Devuelve un resumen: 3 emails por hacer hoy",
        ],
        rules: [
          "La prioridad se declara con el motivo, no es un hecho absoluto",
          "Ningún email archivado o eliminado: solo propuesta",
          "Las peticiones de pago siempre se señalan por separado",
        ],
        output:
          "Tres grupos (urgent/important/normal) con los 3 emails «por hacer hoy» y las peticiones de pago",
        example: "Hazme la clasificación de los emails no leídos",
      },
      "email-draft": {
        name: "Borrador de Respuesta",
        description:
          "Genera el borrador de respuesta basándose en el contexto y las preferencias del remitente. Úsala con peticiones que requieran respuesta.",
        whenNot: [
          "Email que requiere un compromiso económico o legal: solo borrador, con aprobación",
          "Contenido que requiere datos no disponibles: señala el hueco",
        ],
        procedure: [
          "Lee el email original y el historial del hilo",
          "Identifica las preguntas por responder y la información que falta",
          "Escribe el borrador: asunto, apertura, respuestas numeradas, cierre",
          "Tono coherente con los intercambios previos del cliente",
          "El ENVÍO es una acción que requiere aprobación explícita",
        ],
        rules: [
          "El envío requiere siempre aprobación: esta competencia solo prepara",
          "Máximo 150 palabras, un tema por email",
          "Ninguna promesa de entrega o precio sin confirmar",
        ],
        output: "Borrador (asunto, cuerpo) + lista de la información pendiente + estado del envío (por aprobar)",
        example: "Responde al email de ayer que nos pide los plazos de entrega",
      },
      "deadline-tracking": {
        name: "Seguimiento de Vencimientos",
        description:
          "Registra vencimientos y compromisos con avisos por prioridad. Úsala para no perder los compromisos de los emails.",
        whenNot: [
          "Vencimientos formales de empresa (contratos, fiscales): los lleva Presupuestos & Finanzas",
          "Compromisos ya vencidos por señalar en bloque: enuméralos antes por fecha",
        ],
        procedure: [
          "Extrae de los emails los compromisos con fecha",
          "Asigna prioridad según impacto y vencimiento",
          "Crea una tarea por cada compromiso con fecha y responsable",
          "Señala hoy los compromisos que vencen en los próximos 3 días",
          "Actualiza el estado de las tareas ya en curso",
        ],
        rules: [
          "Cada vencimiento tiene fecha y responsable: sin responsable no entra en el seguimiento",
          "Ningún vencimiento inventado: solo el declarado o deducible",
          "Usa el huso horario del usuario para los vencimientos",
        ],
        output:
          "Lista de compromisos (qué, fecha, responsable, prioridad) + destacados de los próximos 3 días",
        example: "Qué vencimientos tengo en los próximos 3 días?",
      },
      "meeting-notes": {
        name: "Actas de Reunión",
        description:
          "Genera las actas de reunión con acciones y responsables. Úsala tras cada reunión con notas o transcripción.",
        whenNot: [
          "Reuniones reservadas sin autorización para compartir el acta: pregunta",
          "Reuniones sin contenido sobre el que escribir: mejor sin acta",
        ],
        procedure: [
          "Recoge los apuntes o la transcripción",
          "Separa: decisiones, acciones, puntos abiertos",
          "Asigna a cada acción un responsable y una fecha",
          "Resume en un máximo de una página: ningún acta interminable",
          "Exporta el acta al documento de la empresa",
        ],
        rules: [
          "Cada acción tiene responsable y fecha: si faltan, se señala como «por asignar»",
          "Resumen fiel: ninguna interpretación de las decisiones",
          "Datos personales de los participantes: solo nombre y cargo",
        ],
        output:
          "Acta: decisiones, acciones (qué, quién, para cuándo), puntos abiertos",
        example: "Haz el acta de la reunión de esta mañana",
      },
    },
  },
  "reports-bi": {
    name: "Informes & Decisiones",
    tagline: "Análisis de datos y decisiones estratégicas",
    description:
      "Inteligencia de negocio: informes de KPI semanales y mensuales, comparación periodo a periodo, detección de anomalías, prioridades estratégicas y resumen para el titular en lenguaje sencillo.",
    category: "Analítica",
    agents: {
      "business-manager": "Business Manager analiza datos y decisiones",
      "analytics-agent": "Analytics Agent genera informes detallados",
      "finance-manager": "Finance Manager usa los datos financieros",
      "shopify-agent": "Shopify Agent aporta los datos e-commerce",
    },
    integrations: {
      googlesheets: "Sheets es la fuente principal de datos",
      microsoftexcel: "Excel para los análisis avanzados",
      airtable: "Airtable para la base de datos del negocio",
      hubspot: "HubSpot para los datos del CRM",
      microsoftpowerpoint: "PowerPoint para el informe a la dirección",
      googleanalytics: "Analytics para las métricas web",
      googleads: "Google Ads para las métricas de marketing",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: informe de KPI, comparación de periodos, anomalías, prioridades estratégicas y resumen ejecutivo.",
          "Sheets, Excel, Airtable, HubSpot y PowerPoint ya disponibles; Analytics y Ads próximamente.",
        ],
      },
    ],
    skills: {
      "kpi-report": {
        name: "Informe de KPI",
        description:
          "Genera el informe de KPI semanales o mensuales con métricas clave y tendencias. Úsala para el ritmo semanal o mensual.",
        whenNot: [
          "KPI no definidos por el titular: propone un conjunto estándar y pide confirmación",
          "Datos de un solo día presentados como tendencia: no es una tendencia",
        ],
        procedure: [
          "Confirma el periodo y la lista de KPI con el titular (o usa el valor por defecto: facturación, pedidos, coste, margen)",
          "Lee los datos de las fuentes conectadas",
          "Calcula cada KPI del periodo y la variación sobre el anterior",
          "Señala los KPI fuera de objetivo",
          "Cierra con 3 acciones, no con la repetición de los números",
        ],
        rules: [
          "Cita siempre fuente y periodo de cada cifra",
          "Ningún KPI calculado sobre datos incompletos sin aviso",
          "El informe no interpreta las causas: constata y propone",
        ],
        output:
          "Tabla de KPI (valor, variación, estado) + 3 fuera de objetivo + 3 acciones + fuentes",
        example: "Hazme el informe de KPI de esta semana",
      },
      "period-comparison": {
        name: "Comparación de Periodos",
        description:
          "Compara los datos de un periodo con el anterior analizando variaciones y anomalías. Úsala para entender qué ha cambiado.",
        whenNot: [
          "Periodos de distinta duración: normaliza por día antes de comparar",
          "Datos con menos de 2 periodos: la comparación no tiene sentido",
        ],
        procedure: [
          "Define los dos periodos, misma duración",
          "Compara las métricas y calcula la variación absoluta y porcentual",
          "Señala las anomalías: variaciones más allá del umbral típico del dato",
          "Para cada anomalía, enumera 3 hipótesis verificables (no una explicación)",
          "Indica qué datos harían falta para confirmar",
        ],
        rules: [
          "Más facturación nunca es igual a éxito: mira el margen junto a la facturación",
          "Las anomalías se señalan, no se explican con certeza",
          "Cada variación va acompañada de la variación en valor absoluto",
        ],
        output:
          "Tabla comparativa (periodo A, periodo B, delta, delta %) + anomalías + hipótesis verificables",
        example: "Compara este trimestre con el anterior",
      },
      "anomaly-detection": {
        name: "Detección de Anomalías",
        description:
          "Detecta anomalías en los datos y propone las comprobaciones. Úsala cuando un número se aparta de la norma.",
        whenNot: [
          "Anomalías sin explicación: no las trates como seguras",
          "Datos estacionales (fiestas, rebajas): compara con el mismo periodo del año anterior",
        ],
        procedure: [
          "Calcula media y desviación estándar del último periodo",
          "Señala los valores a más de 2 desviaciones de la media",
          "Compara con el mismo periodo del año anterior para excluir la estacionalidad",
          "Clasifica: anomalía de sistema, evento aislado, error de dato",
          "Propone la comprobación concreta para cada una",
        ],
        rules: [
          "Cada anomalía lleva la comprobación que la confirmaría",
          "Ninguna alarma sin el valor de comparación",
          "Posible error de dato: comprueba siempre la fuente",
        ],
        output:
          "Lista de anomalías (métrica, valor, media, desviación, clasificación, comprobación propuesta)",
        example: "Febrero se ha desplomado, qué ha pasado?",
      },
      "strategic-priorities": {
        name: "Prioridades Estratégicas",
        description:
          "Convierte los datos en prioridades estratégicas con impacto y coste estimados. Úsala para decidir dónde invertir el tiempo.",
        whenNot: [
          "Prioridades que requieren inversiones financieras: hacen falta los datos de caja",
          "Decisiones ya tomadas: esta competencia ayuda a elegir, no a ratificar",
        ],
        procedure: [
          "Enumera los candidatos (acciones, proyectos, canales) surgidos de los datos",
          "Valora cada candidato: impacto esperado, esfuerzo, coste, plazo de retorno",
          "Ordena por relación impacto/esfuerzo",
          "Propone un máximo de 3 prioridades con una línea de comprobación para cada una",
          "Indica qué NO hacer para liberar tiempo",
        ],
        rules: [
          "Máximo 3 prioridades: una lista larga no es una prioridad",
          "El impacto se declara como estimación con el razonamiento",
          "Ninguna recomendación basada en un solo dato",
        ],
        output:
          "Tabla de candidatos (impacto, esfuerzo, coste, retorno) + 3 prioridades + qué no",
        example: "Qué hacemos primero el próximo trimestre?",
      },
      "executive-summary": {
        name: "Resumen Ejecutivo",
        description:
          "Resume los datos para el titular en lenguaje sencillo, sin jerga. Úsala para el briefing semanal.",
        whenNot: [
          "Datos no consolidados: señala que el resumen es provisional",
          "Petición de un documento formal: hace falta Documentación, no un resumen",
        ],
        procedure: [
          "Toma los 5 datos más relevantes del periodo",
          "Tradúcelos a lenguaje de negocio: qué pasó, qué significa",
          "Separa: bien, por vigilar, por resolver",
          "Cierra con 3 decisiones solicitadas al titular",
          "Mantén un máximo de 200 palabras",
        ],
        rules: [
          "Sin jerga técnica ni fórmulas de BI sin explicar",
          "Cada número debe estar en una frase",
          "El resumen no oculta los datos negativos",
        ],
        output:
          "Briefing (bien / por vigilar / por resolver) + 3 decisiones solicitadas",
        example: "Escribe el briefing para el titular de esta semana",
      },
    },
  },
  "hr-recruiting": {
    name: "RR. HH. & Selección",
    tagline: "Gestiona candidaturas y contratación",
    description:
      "Suite de RR. HH.: filtrado de CV frente a la descripción del puesto, matching de competencias, preguntas de precualificación, feedback estructurado a candidatos, planificación de entrevistas y ficha de candidato.",
    category: "Recursos humanos",
    agents: {
      "hr-recruiter": "HR & Recruiter gestiona la selección de personal",
      "calendar-booking": "Calendar Booking planifica las entrevistas",
      "email-manager": "Email Manager se comunica con los candidatos",
    },
    integrations: {
      gmail: "Gmail se comunica con los candidatos",
      googlecalendar: "Calendar planifica las entrevistas",
      googledrive: "Drive aloja los CV y documentos",
      microsoftword: "Word genera los documentos de RR. HH.",
      airtable: "Airtable registra los candidatos",
      notion: "Notion aloja las notas de las entrevistas",
      googlemeet: "Google Meet para las entrevistas por vídeo",
      microsoftoutlook: "Outlook amplía la cobertura del calendario",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: filtrado de CV, matching de candidatos, preguntas de entrevista, feedback y planificación de entrevistas.",
          "Ninguna puntuación usa datos personales protegidos: solo valoramos competencias y experiencias documentadas.",
        ],
      },
    ],
    skills: {
      "cv-screening": {
        name: "Filtrado de CV",
        description:
          "Compara los CV con la descripción del puesto y genera el matching de competencias. Úsala con nuevas candidaturas.",
        whenNot: [
          "Candidaturas para puestos sujetos a criterios de diversidad: los criterios siguen siendo los de la empresa",
          "CV ilegibles o en formato no compatible: pide una versión alternativa",
        ],
        procedure: [
          "Extrae de la descripción del puesto los requisitos obligatorios y los deseables",
          "Del CV extrae: experiencia, cargos, sector, resultados, idiomas",
          "Compara por requisito: cumplido, parcial, ausente",
          "Calcula la cobertura de requisitos y produce el juicio motivado",
          "Enumera los puntos por verificar en la entrevista",
        ],
        rules: [
          "Ningún juicio basado en datos personales (edad, género, nacionalidad, fotografía)",
          "Valora solo competencias y experiencias documentadas",
          "La puntuación es un apoyo a la decisión humana, nunca una decisión",
        ],
        output:
          "Tabla de requisitos (obligatorio/deseable, resultado, evidencia del CV) + cobertura % + puntos por verificar",
        example: "Valora los CV recibidos para el anuncio de dependiente",
      },
      "candidate-matching": {
        name: "Matching de Candidatos",
        description:
          "Compara las competencias del candidato con los requisitos del puesto y genera una clasificación. Úsala tras filtrar varias candidaturas.",
        whenNot: [
          "Una sola candidatura: el matching no hace falta, usa Filtrado de CV",
          "Clasificación para usar como resultado definitivo: la decisión sigue siendo humana",
        ],
        procedure: [
          "Recoge las fichas de los candidatos ya filtradas",
          "Compara cada candidato en los requisitos obligatorios, por orden de peso",
          "Asigna una puntuación 0-100 y la motivación en 2 líneas",
          "Ordena por puntuación y señala los candidatos «en discusión»",
          "Actualiza el registro de candidatos",
        ],
        rules: [
          "Ningún dato personal en la puntuación",
          "La motivación por candidato debe ser específica, no genérica",
          "Primera valoración, no resultado: la selección la hace una persona",
        ],
        output:
          "Clasificación (candidato, puntuación, requisitos cubiertos, motivación) + nota «por valorar con RR. HH.»",
        example: "Ordena los 6 candidatos para el puesto de dependiente",
      },
      "interview-questions": {
        name: "Preguntas de Entrevista",
        description:
          "Genera las preguntas de precualificación según el puesto y el nivel de experiencia. Úsala antes de la entrevista.",
        whenNot: [
          "Puesto no definido: pide la descripción del puesto y el nivel",
          "Preguntas que requieran datos personales protegidos: excluidas",
        ],
        procedure: [
          "Toma la descripción del puesto y el nivel del cargo",
          "Genera 6-8 preguntas: 3 conductuales, 3 técnicas, 1-2 de verificación",
          "Para cada pregunta indica qué se quiere observar",
          "Añade 2-3 preguntas finales para el candidato",
          "Evita cualquier pregunta sobre edad, estado civil, salud, religión u orientación",
        ],
        rules: [
          "Cero preguntas discriminatorias: solo competencias y experiencias",
          "Las preguntas conductuales empiezan por «Cuéntame una vez en que...»",
          "Máximo 10 preguntas: una entrevista larga no es una entrevista",
        ],
        output:
          "Lista de preguntas por tipo con el objetivo observado + preguntas finales",
        example: "Prepara las preguntas para la entrevista del comercial",
      },
      "candidate-feedback": {
        name: "Feedback a Candidatos",
        description:
          "Genera el feedback estructurado para los candidatos tras la entrevista. Úsala para comunicar resultado y feedback.",
        whenNot: [
          "Feedback que anuncie una decisión aún no tomada internamente: espera el resultado",
          "Feedback que requiera hablar de retribución: solo si está autorizado",
        ],
        procedure: [
          "Confirma el resultado del proceso con quien decidió",
          "Prepara el feedback: resultado, motivos, 2 puntos fuertes, 1 área de mejora",
          "Tono: respeto y especificidad, nunca genérico",
          "El envío al candidato requiere aprobación",
          "Registra el resultado en la ficha del candidato",
        ],
        rules: [
          "Envío del email = acción que requiere aprobación",
          "Ningún feedback discriminatorio ni referencias a datos personales",
          "Un candidato merece un feedback útil: no un «no es el perfil»",
        ],
        output:
          "Borrador de feedback (resultado, 2 puntos fuertes, 1 área de mejora) + estado del envío (por aprobar)",
        example: "Escribe el feedback a la candidata para el puesto de contable",
      },
      "interview-planning": {
        name: "Planificación de Entrevistas",
        description:
          "Planifica las entrevistas (quién entrevista, cuándo, con qué preguntas) y prepara la ficha del candidato. Úsala para organizar las jornadas de entrevista.",
        whenNot: [
          "Entrevistas más allá de la disponibilidad de los participantes: propone alternativas",
          "Implica al candidato solo tras la confirmación interna",
        ],
        procedure: [
          "Recoge la disponibilidad del entrevistador, del candidato y del panel",
          "Propone 2-3 huecos, con duración y participantes",
          "Asigna a cada entrevistador un enfoque distinto, sin solapamientos",
          "Crea el evento solo tras la confirmación del candidato",
          "Prepara la ficha del candidato con CV, requisitos y preguntas asignadas",
        ],
        rules: [
          "El huso horario y la duración siempre se indican en la propuesta",
          "Ningún calendario personal de los participantes más allá de la agenda compartida",
          "La ficha del candidato contiene solo datos de selección, no notas privadas",
        ],
        output:
          "Plan de entrevistas (huecos, participantes, enfoque, duración) + ficha de candidato lista para cada entrevista",
        example: "Organiza las entrevistas del martes para los 3 candidatos finales",
      },
    },
  },
  "documents-office": {
    name: "Documentos & Oficina",
    tagline: "Gestiona documentos y oficina",
    description:
      "Suite documental: lectura y resumen de PDF, extracción de datos estructurados, comparación entre versiones de contrato, creación y edición de documentos Word, Excel y PowerPoint, respuestas a preguntas sobre el contenido del documento.",
    category: "Productividad",
    agents: {
      "document-agent": "Document Agent gestiona los documentos",
      "quote-agent": "Quotes & Estimates genera los documentos formales",
      "business-manager": "Business Manager analiza los documentos",
      "support-agent": "Support Agent responde a las preguntas de los clientes",
    },
    integrations: {
      microsoftword: "Word para la creación de documentos",
      microsoftexcel: "Excel para el análisis de datos",
      microsoftpowerpoint: "PowerPoint para las presentaciones",
      googledrive: "Drive aloja los documentos",
      microsoftonenote: "OneNote aloja las notas",
      microsoftonedrive: "OneDrive sincroniza los documentos",
      microsoftsharepoint: "SharePoint para los documentos enterprise",
      dropbox: "Dropbox para el almacenamiento de documentos",
      googledocs: "Docs para la colaboración en documentos",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: resumen de PDF, extracción de datos, Q&A con citas, creación de documentos y comparación de versiones.",
          "Word, Excel, PowerPoint, Drive y OneNote ya disponibles; OneDrive, SharePoint, Dropbox y Docs próximamente.",
        ],
      },
    ],
    skills: {
      "pdf-summary": {
        name: "Resumen de PDF",
        description:
          "Lee y resume un documento PDF extrayendo los puntos clave. Úsala con contratos, facturas, manuales e informes largos.",
        whenNot: [
          "PDF escaneado como imagen sin OCR: señala el límite",
          "Documento con datos personales de terceros: verifica la base jurídica antes de compartir su contenido",
        ],
        procedure: [
          "Lee el documento entero antes de resumir",
          "Extrae: objeto, sujetos, fechas, importes, obligaciones, vencimientos",
          "Resume en 3 bloques: en síntesis, puntos clave, por verificar",
          "Cierra con las preguntas que el documento no responde",
          "Si son muchas páginas, cita las referencias de página",
        ],
        rules: [
          "Máximo 250 palabras: si hace falta más, es un resumen por bloques",
          "Cita la página cuando el documento supere las 5 páginas",
          "Ningún dato inventado: si no está en el documento, se escribe «no presente»",
        ],
        output:
          "Resumen: en síntesis (3 líneas) + puntos clave con referencias + preguntas abiertas",
        example: "Resume este contrato de suministro adjunto",
      },
      "data-extraction": {
        name: "Extracción de Datos",
        description:
          "Extrae datos estructurados de documentos (tablas, fechas, importes). Úsala para rellenar hojas de cálculo o informes.",
        whenNot: [
          "Tablas con varias interpretaciones posibles: señala la ambigüedad",
          "Extracción de datos personales innecesarios: solo los campos necesarios",
        ],
        procedure: [
          "Identifica la estructura del documento (tablas, listas, secciones)",
          "Define los campos por extraer antes de empezar",
          "Extrae línea por línea, sin interpretar",
          "Señala los valores ilegibles como «por verificar», no como estimaciones",
          "Exporta en formato tabular listo para Excel/Sheets",
        ],
        rules: [
          "Ninguna interpretación: se extrae, no se deduce",
          "Los valores no legibles se marcan, no se inventan",
          "Fechas en formato ISO (YYYY-MM-DD) para evitar ambigüedades",
        ],
        output:
          "Tabla extraída (campos en columna) + recuento de filas + lista de valores por verificar",
        example: "Extrae la tabla de gastos del PDF de la nota de gastos",
      },
      "document-qa": {
        name: "Q&A de Documentos",
        description:
          "Responde a preguntas sobre el contenido de los documentos con citas. Úsala cuando el usuario pida información sobre un documento cargado.",
        whenNot: [
          "Pregunta que el documento no cubre: dilo, no amplíes el documento",
          "Petición de interpretación legal: reproduce el texto, la interpretación queda para un profesional",
        ],
        procedure: [
          "Busca en el documento el pasaje pertinente",
          "Responde en 2-4 líneas, con la cita del texto",
          "Indica página o sección",
          "Si hay varias respuestas plausibles, preséntalas todas",
          "Si la respuesta no está, propone dónde buscar",
        ],
        rules: [
          "Cada respuesta lleva la cita del documento",
          "Ninguna inferencia sin apoyo en el texto",
          "Tono: directo, con la fuente justo bajo la respuesta",
        ],
        output: "Respuesta breve + cita (entre paréntesis) + referencia de página",
        example: "En el contrato hay una cláusula de penalización por retraso?",
      },
      "document-creation": {
        name: "Creación de Documentos",
        description:
          "Crea y edita documentos Word, Excel y PowerPoint. Úsala cuando haga falta un documento nuevo o actualizar uno existente.",
        whenNot: [
          "Documento para usar como fuente autorizada (contratos, balances): revisión humana obligatoria",
          "Compartir el documento con el cliente: acción que requiere aprobación",
        ],
        procedure: [
          "Pide o usa la plantilla existente de la empresa",
          "Rellena los campos con los datos verificados",
          "Para Excel: una tabla, encabezados fijos, fórmulas si hacen falta",
          "Para PowerPoint: máx. 1 mensaje por slide, títulos como afirmaciones",
          "Genera el archivo y devuelve el nombre del archivo",
        ],
        rules: [
          "No crees documentos que imiten el aspecto de terceros",
          "Para Excel: ningún dato fijo dentro de las fórmulas",
          "Documentos con datos personales: verifica el consentimiento",
        ],
        output:
          "Archivo generado (nombre, formato) + lista de campos rellenados + posibles revisiones solicitadas",
        example: "Crea el informe en Word con los datos de esta semana",
      },
      "version-comparison": {
        name: "Comparación de Versiones",
        description:
          "Compara dos versiones de un documento y enumera las diferencias. Úsala con revisiones de contrato o borradores.",
        whenNot: [
          "Documentos en formatos no comparables (PDF escaneado): señala el límite",
          "Versiones sin fecha: pregunta cuál es la más reciente",
        ],
        procedure: [
          "Compara los dos documentos sección por sección",
          "Clasifica cada diferencia: añadido, eliminado, modificado",
          "Para cada cambio, valora el impacto (sustancial o formal)",
          "Señala los cambios que requieren atención (importes, fechas, obligaciones)",
          "No des dictámenes legales: reproduce las diferencias",
        ],
        rules: [
          "Ningún dictamen legal sobre los cambios: solo constatación",
          "Los cambios en importes y vencimientos siempre se destacan",
          "Ordena por impacto decreciente",
        ],
        output:
          "Lista de diferencias (sección, tipo, impacto, texto antes/después) + síntesis de los cambios sustanciales",
        example: "Compara la v2 del contrato con la v1",
      },
    },
  },
  "research-competitor": {
    name: "Investigación de Competencia",
    tagline: "Analiza mercado y competencia",
    description:
      "Herramienta de investigación de mercado: estudio de mercado con fuentes verificables, comparación de precios y reseñas, ficha completa de competidor y síntesis con citas y nivel de confianza.",
    category: "Investigación",
    agents: {
      "research-agent": "Research Agent analiza mercado y competencia",
      "seo-agent": "SEO Content usa los datos de la competencia",
      "business-manager": "Business Manager usa los análisis",
      "social-media-agent": "Social Media monitoriza a la competencia",
    },
    integrations: {
      notion: "Notion aloja las investigaciones",
      googlesheets: "Sheets para los datos de la competencia",
      microsoftpowerpoint: "PowerPoint para las presentaciones",
      googledrive: "Drive aloja los documentos de investigación",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: estudio de mercado, comparación de precios, ficha de competidor y síntesis con nivel de confianza.",
          "Cada dato lleva la fuente: si la investigación no encuentra un valor, la competencia lo declara en vez de estimarlo.",
        ],
      },
    ],
    skills: {
      "market-research": {
        name: "Estudio de Mercado",
        description:
          "Investiga el mercado de referencia con fuentes verificables y análisis de tendencias. Úsala al inicio de un análisis.",
        whenNot: [
          "Datos de mercado no verificables: se declara el límite, no se estima",
          "Petición de previsiones a largo plazo: solo tendencias documentadas",
        ],
        procedure: [
          "Define el mercado: sector, zona geográfica, segmento de clientes",
          "Recoge datos de fuentes públicas y verificables",
          "Separa los datos verificados de las opiniones",
          "Identifica las tendencias con la fuente que las sostiene",
          "Cada dato lleva la fuente (URL o nombre del documento) y la fecha",
        ],
        rules: [
          "Ningún dato de mercado sin fuente citada",
          "Las estimaciones de terceros son estimaciones: atribúyelas",
          "Ningún dato inventado cuando la investigación falla: dilo",
        ],
        output:
          "Síntesis de mercado + tendencias (con fuente y fecha) + datos verificados vs estimaciones",
        example: "Cuánto crece el sector de las sillas de oficina en Italia?",
      },
      "price-comparison": {
        name: "Comparación de Precios",
        description:
          "Compara los precios de la competencia con nuestra oferta. Úsala para decidir el posicionamiento.",
        whenNot: [
          "Precios no publicados: se declara «no publicado», no se estima",
          "Productos no comparables: primero alinea las especificaciones",
        ],
        procedure: [
          "Alinea las especificaciones: modelos, dimensiones, materiales, servicios incluidos",
          "Recoge los precios publicados, con la fecha",
          "Compara a igualdad de especificaciones",
          "Calcula el posicionamiento respecto al mercado",
          "Señala dónde nuestra oferta es más cara y dónde es más conveniente",
        ],
        rules: [
          "Compara solo productos equivalentes: distinta especificación = comparación inútil",
          "Cada precio con la fuente y la fecha",
          "Ningún dato de precio no publicado",
        ],
        output:
          "Tabla de precios (competidor, especificaciones, precio, fuente, fecha) + posicionamiento",
        example: "Comparemos los precios de nuestros competidores directos",
      },
      "competitor-profile": {
        name: "Ficha de Competidor",
        description:
          "Genera la ficha completa del competidor con precios, reseñas y posicionamiento. Úsala para los análisis periódicos.",
        whenNot: [
          "Competidor sin actividad verificable: se declara, no se inventa",
          "Ficha usada para decisiones de precio: hace falta una decisión humana",
        ],
        procedure: [
          "Recoge la información pública sobre el competidor",
          "Organiza: posicionamiento, oferta, precios, canales, reseñas",
          "Calcula el sentimiento de las reseñas (positivas/negativas) si están disponibles",
          "Indica los puntos fuertes y débiles observables",
          "Cierra con 3 ideas de diferenciación para nosotros",
        ],
        rules: [
          "Solo datos públicos: nada de información no pública",
          "Cada afirmación lleva la fuente",
          "Ningún juicio moral sobre la empresa competidora",
        ],
        output:
          "Ficha de competidor (posicionamiento, oferta, precios, reseñas, fuerzas/debilidades) + 3 ideas de diferenciación",
        example: "Hazme la ficha de competidor de Bianchi Srl",
      },
      "insight-synthesis": {
        name: "Síntesis con Citas",
        description:
          "Sintetiza las investigaciones en un documento con citas y nivel de confianza. Úsala para cerrar un análisis.",
        whenNot: [
          "Fuentes insuficientes: la síntesis declara el nivel de confianza bajo",
          "Documento para compartir externamente: acción que requiere aprobación",
        ],
        procedure: [
          "Recoge los resultados de las investigaciones previas",
          "Separa: confirmado (varias fuentes), probable (una fuente sólida), por verificar",
          "Asigna un nivel de confianza: alto, medio, bajo",
          "Cita cada afirmación con la fuente entre paréntesis",
          "Enumera las comprobaciones aún pendientes",
        ],
        rules: [
          "Cada afirmación con su fuente; ninguna síntesis sin citas",
          "El nivel de confianza es obligatorio",
          "La información no verificada queda marcada como tal",
        ],
        output:
          "Documento de síntesis: confirmado / probable / por verificar + fuentes + nivel de confianza",
        example: "Cerremos la investigación de mercado con una síntesis citada",
      },
    },
  },
  "projects-tasks": {
    name: "Proyectos & Tareas",
    tagline: "Gestiona proyectos y tareas",
    description:
      "Gestión de proyectos: convertir las peticiones en tareas, actualizar los tableros, informe de avance, standup automático y recordatorios de vencimientos.",
    category: "Productividad",
    agents: {
      "personal-assistant": "Personal Assistant gestiona tareas y proyectos",
      "business-manager": "Business Manager registra el avance de los proyectos",
      "email-manager": "Email Manager comunica tareas y vencimientos",
    },
    integrations: {
      trello: "Trello para la gestión de proyectos",
      asana: "Asana para la gestión de tareas",
      clickup: "ClickUp para la gestión de proyectos",
      notion: "Notion para tareas y documentos",
      slack: "Slack para los avisos al equipo",
      github: "GitHub para los equipos técnicos",
      jira: "Jira para los proyectos enterprise",
      microsoftteams: "Teams para la colaboración",
    },
    changelog: [
      {
        version: "1.0.0",
        date: "2026-01-15",
        changes: [
          "Primera versión: petición que se convierte en tarea, actualización del tablero, informe de avance, standup y recordatorios.",
          "Trello, Asana, ClickUp, Notion, Slack y GitHub ya disponibles; Jira y Teams próximamente.",
        ],
      },
    ],
    skills: {
      "request-to-task": {
        name: "Petición a Tarea",
        description:
          "Convierte una petición verbal en tareas estructuradas con prioridad y plazo. Úsala con peticiones por distribuir.",
        whenNot: [
          "Petición que no es una tarea (información, pregunta): no crees tareas",
          "Proyecto sin objetivo definido: primero aclara el objetivo",
        ],
        procedure: [
          "Pide el objetivo de la petición en una frase",
          "Divide en 3-7 tareas con un resultado verificable cada una",
          "Asigna prioridad (P1/P2/P3) y estimación en horas",
          "Define el plazo o pídelo",
          "Crea las tareas en el tablero y devuelve la lista",
        ],
        rules: [
          "Una tarea = un resultado verificable, no una serie de acciones",
          "Cada tarea tiene prioridad y plazo; si no, es un deseo",
          "Ninguna tarea sin responsable: pregunta quién se encarga",
        ],
        output:
          "Lista de tareas (título, resultado, prioridad, estimación, plazo, responsable) + confirmación de creación",
        example: "El cliente quiere el nuevo catálogo para fin de mes: qué tareas creo?",
      },
      "board-update": {
        name: "Actualización del Tablero",
        description:
          "Actualiza el tablero del proyecto (Trello, Asana, ClickUp) con el estado de las tareas. Úsala al final del día.",
        whenNot: [
          "Estado no confirmado por el equipo: no muevas las tareas por deducción",
          "Tablero no conectado: produce la lista de cambios por aplicar",
        ],
        procedure: [
          "Lee el tablero y compara con los compromisos conocidos",
          "Mueve solo las tareas con estado confirmado",
          "Añade los comentarios de estado a las tareas en curso",
          "No cierres las tareas: corresponde a quien las hizo",
          "Devuelve la lista de cambios aplicados",
        ],
        rules: [
          "Ninguna tarea movida a «hecha» sin confirmación",
          "Las prioridades existentes no se cambian sin motivo declarado",
          "Cada cambio es reversible: nada de eliminaciones",
        ],
        output: "Lista de cambios aplicados + tareas sin cambios por duda",
        example: "Actualiza el tablero con el estado de hoy",
      },
      "progress-report": {
        name: "Informe de Avance",
        description:
          "Genera el informe de avance del proyecto con bloqueos y próximos pasos. Úsala para el cliente o la dirección.",
        whenNot: [
          "Proyecto sin tareas registradas: el informe sería inventado",
          "Informe para uso interno y externo a la vez: pregunta cuál",
        ],
        procedure: [
          "Recoge las tareas por estado: completadas, en curso, por empezar",
          "Calcula el avance porcentual sobre las tareas completadas",
          "Enumera los bloqueos con la causa y quién debe desbloquearlo",
          "Define los 3 próximos pasos con responsable y fecha",
          "Señala las desviaciones respecto a la planificación",
        ],
        rules: [
          "El avance se calcula sobre las tareas, no sobre las estimaciones de esfuerzo",
          "Ningún bloqueo sin responsable asignado",
          "Si un proyecto se retrasa, se declara: nunca «en línea» si no lo está",
        ],
        output:
          "Informe: avance % + completadas/en curso/por empezar + bloqueos (causa, responsable) + 3 próximos pasos",
        example: "En qué punto estamos con el proyecto del catálogo?",
      },
      "auto-standup": {
        name: "Standup Automático",
        description:
          "Genera el resumen diario de standup desde las tareas del equipo. Úsala por la mañana o a petición.",
        whenNot: [
          "Equipo sin tareas registradas: el standup no es reconstruible",
          "Standup con datos personales: nada de notas privadas de los miembros del equipo",
        ],
        procedure: [
          "Recoge por cada miembro: tareas en curso, completadas ayer, bloqueos",
          "Agrupa en tres columnas: ayer, hoy, bloqueos",
          "Señala los miembros sin actualizaciones",
          "Cierra con las decisiones necesarias hoy",
          "Máximo 15 líneas: un standup no es un informe",
        ],
        rules: [
          "Ninguna valoración de las personas: solo hechos sobre las tareas",
          "Nada de notas privadas de los miembros del equipo",
          "Quien no ha actualizado se señala, no se deduce",
        ],
        output: "Standup: ayer / hoy / bloqueos (por tarea, no por persona) + decisiones solicitadas",
        example: "Prepara el standup de hoy",
      },
      "deadline-reminder": {
        name: "Recordatorio de Vencimientos",
        description:
          "Recuerda los vencimientos próximos con el margen necesario para actuar. Úsala de forma programada o diaria.",
        whenNot: [
          "Recordatorio ya enviado hoy para el mismo vencimiento: no lo dupliques",
          "Vencimientos formales de empresa: los lleva Presupuestos & Finanzas",
        ],
        procedure: [
          "Enumera los vencimientos en 3 días",
          "Para cada uno indica el margen restante y si ya va con retraso",
          "Señala los retrasados con la nueva fecha propuesta",
          "Envía un recordatorio sintético (máx. 5 líneas)",
          "Propone actualizar las fechas si el margen es irrecuperable",
        ],
        rules: [
          "Un recordatorio por vencimiento al día",
          "Los vencimientos retrasados se dicen abiertamente: nada de alarmas implícitas",
          "Ningún envío automático a terceros: solo al responsable interno",
        ],
        output:
          "Recordatorio enviado con lista de vencimientos (vencimiento, margen, estado) + propuesta para las fechas vencidas",
        example: "Qué vence en los próximos 3 días?",
      },
    },
  },
};
