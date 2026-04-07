export const RESTAURANT_NAME = "O Lar de Pereiras";
export const RESTAURANT_EMOJI = "🍐";

export const GAME_CONFIG = {
  maxLives: 3,
  startingMoney: 20,
  baseCustomerInterval: 12000,
  minCustomerInterval: 5000,
  patienceBase: 25000,
  patienceMin: 12000,
  cookingTimeBase: 8000,
  cookingTimeMin: 4000,
  rankingSize: 20,
  dessertPrizeMinutes: 5,
  hiringCosts: {
    waiter: 80,
    cook: 120,
  },
  hiringMultiplier: 1.5,
  levelThresholds: [0, 200, 500, 1000, 1800, 3000],
  moneyPerDayBonus: 50,
};

export interface MenuItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  cookTime: number;
  points: number;
  category: "starter" | "main" | "dessert" | "drink";
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "pulpo", name: "Pulpo á Feira", emoji: "🐙", price: 18, cookTime: 7000, points: 30, category: "main" },
  { id: "empanada", name: "Empanada Gallega", emoji: "🥧", price: 12, cookTime: 5000, points: 20, category: "starter" },
  { id: "lacón", name: "Lacón con Grelos", emoji: "🥩", price: 16, cookTime: 9000, points: 28, category: "main" },
  { id: "caldo", name: "Caldo Gallego", emoji: "🍲", price: 8, cookTime: 4000, points: 15, category: "starter" },
  { id: "vieiras", name: "Vieiras Gratinadas", emoji: "🐚", price: 22, cookTime: 6000, points: 35, category: "main" },
  { id: "pimientos", name: "Pimientos de Padrón", emoji: "🫑", price: 9, cookTime: 3000, points: 15, category: "starter" },
  { id: "merluza", name: "Merluza á Galega", emoji: "🐟", price: 20, cookTime: 8000, points: 32, category: "main" },
  { id: "filloas", name: "Filloas con Mel", emoji: "🥞", price: 7, cookTime: 3000, points: 18, category: "dessert" },
  { id: "tarta", name: "Tarta de Santiago", emoji: "🎂", price: 6, cookTime: 2000, points: 20, category: "dessert" },
  { id: "ribeiro", name: "Vino Ribeiro", emoji: "🍷", price: 5, cookTime: 1000, points: 10, category: "drink" },
  { id: "clara", name: "Clara con Limón", emoji: "🍺", price: 3, cookTime: 1000, points: 8, category: "drink" },
  { id: "agua", name: "Agua de Mondariz", emoji: "💧", price: 2, cookTime: 500, points: 5, category: "drink" },
];

export interface TriviaQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface SpainRegion {
  id: string;
  name: string;
  emoji: string;
}

export const SPAIN_REGIONS: SpainRegion[] = [
  { id: "galicia", name: "Galicia", emoji: "🌿" },
  { id: "andalucia", name: "Andalucía", emoji: "🌺" },
  { id: "catalunya", name: "Catalunya", emoji: "🌹" },
  { id: "madrid", name: "Madrid", emoji: "🐻" },
  { id: "valencia", name: "Valencia", emoji: "🍊" },
  { id: "pais-vasco", name: "País Vasco", emoji: "🌊" },
  { id: "castilla-leon", name: "Castilla y León", emoji: "🏰" },
  { id: "aragon", name: "Aragón", emoji: "🦅" },
  { id: "asturias", name: "Asturias", emoji: "🧀" },
  { id: "canarias", name: "Islas Canarias", emoji: "🌋" },
  { id: "cantabria", name: "Cantabria", emoji: "🏔️" },
  { id: "castilla-mancha", name: "Castilla-La Mancha", emoji: "⚔️" },
  { id: "extremadura", name: "Extremadura", emoji: "🌻" },
  { id: "murcia", name: "Murcia", emoji: "🥗" },
  { id: "navarra", name: "Navarra", emoji: "🐃" },
  { id: "rioja", name: "La Rioja", emoji: "🍷" },
  { id: "baleares", name: "Islas Baleares", emoji: "🏝️" },
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { question: "¿De qué ciudad gallega es típico el pulpo á feira?", options: ["O Carballiño", "Santiago", "Vigo", "A Coruña"], answer: 0, explanation: "O Carballiño es la capital mundial del pulpo. ¡Incluso tiene una fiesta dedicada!" },
  { question: "¿Qué ingrediente principal lleva el Caldo Gallego?", options: ["Grelos y patatas", "Arroz y pollo", "Lentejas y chorizo", "Garbanzos y bacalao"], answer: 0, explanation: "El caldo gallego lleva grelos (o berza), patatas, alubias y unto." },
  { question: "¿Con qué harina se hace la Tarta de Santiago?", options: ["Almendra molida", "Harina de trigo", "Maíz", "Avena"], answer: 0, explanation: "La Tarta de Santiago se hace con almendra molida, huevos y azúcar. Sin harina de trigo." },
  { question: "¿Qué denominación de origen tiene el mejor vino blanco gallego?", options: ["Rías Baixas", "Ribera del Duero", "La Rioja", "Penedès"], answer: 0, explanation: "El Albariño de Rías Baixas es el vino gallego más famoso del mundo." },
  { question: "¿Cómo se llaman las crepes gallegas tradicionales?", options: ["Filloas", "Bicas", "Orellas", "Mexilóns"], answer: 0, explanation: "Las filloas son crepes finas típicas del entroido (carnaval) gallego." },
  { question: "¿Qué es el 'unto' en la cocina gallega?", options: ["Grasa de cerdo curada", "Tipo de queso", "Hierba aromática", "Salsa de tomate"], answer: 0, explanation: "El unto es grasa de cerdo curada, fundamental en el caldo gallego." },
  { question: "¿Los Pimientos de Padrón vienen de qué municipio?", options: ["Padrón, A Coruña", "Padrón, Lugo", "Padrón, Pontevedra", "Padrón, Ourense"], answer: 0, explanation: "Padrón está en A Coruña. ¡Unos pican y outros non!" },
  { question: "¿Qué tipo de queso es el más famoso de Galicia?", options: ["Tetilla", "Manchego", "Cabrales", "Idiazábal"], answer: 0, explanation: "El Queso Tetilla tiene DOP y su forma característica le da el nombre." },
  { question: "¿Cómo se llama el aguardiente gallego de hierbas?", options: ["Herbas", "Orujo", "Queimada", "Licor café"], answer: 1, explanation: "El orujo de hierbas (herbas) es un aguardiente gallego muy conocido." },
  { question: "¿Qué se hace con el orujo en la tradición gallega?", options: ["La queimada", "El lacón", "Las filloas", "El caldo"], answer: 0, explanation: "La queimada es un ritual gallego donde se quema el orujo con azúcar y conjuros." },
  { question: "¿Qué marisco es símbolo de Galicia?", options: ["Las vieiras", "Los camarones", "Las almejas", "Los percebes"], answer: 0, explanation: "La vieira (concha de peregrino) es símbolo del Camino de Santiago y de Galicia." },
  { question: "¿En qué consiste el 'lacón con grelos'?", options: ["Codillo de cerdo con nabizas", "Pollo con espinacas", "Ternera con puerros", "Cerdo con acelgas"], answer: 0, explanation: "Lacón es el codillo de cerdo salado, cocinado con grelos (nabizas) y chorizos." },
  { question: "¿Cuál es la uva principal del vino Albariño?", options: ["Albariño", "Tempranillo", "Garnacha", "Mencía"], answer: 0, explanation: "El Albariño es una uva autóctona gallega, base del famoso vino blanco de Rías Baixas." },
  { question: "¿Qué fiesta gallega se celebra en la noche de San Juan?", options: ["La Noite de San Xoán", "El Entroido", "A Rapa das Bestas", "Os Maios"], answer: 0, explanation: "La Noite de San Xoán se celebra con hogueras y saltos sobre el fuego para purificarse." },
  { question: "¿Qué son los 'grelos' típicos de Galicia?", options: ["Hojas del nabo", "Tipo de seta", "Algas marinas", "Raíces de helecho"], answer: 0, explanation: "Los grelos son las hojas y tallos tiernos del nabo, fundamentales en la cocina gallega." },
  { question: "¿En qué provincia gallega está la Ribeira Sacra?", options: ["Ourense y Lugo", "Pontevedra", "A Coruña", "Solo Ourense"], answer: 0, explanation: "La Ribeira Sacra se extiende entre Ourense y Lugo, famosa por sus viñedos en bancales." },
  { question: "¿Qué es el 'pemento de Arnoia'?", options: ["Pimiento autóctono de Ourense", "Queso ahumado", "Pan de maíz", "Embutido curado"], answer: 0, explanation: "El pimiento de Arnoia es un pimiento dulce típico de la zona de Ourense." },
  { question: "¿Cuál es el postre gallego hecho con castañas?", options: ["Magosto", "Tarta de Santiago", "Bica", "Roscón"], answer: 0, explanation: "El magosto es la tradición de asar castañas, típica del otoño gallego." },
  { question: "¿Qué es una 'pulpeira'?", options: ["Mujer que prepara el pulpo", "Red de pesca", "Olla para marisco", "Tipo de barco"], answer: 0, explanation: "La pulpeira es la mujer especializada en cocer y preparar el pulpo á feira." },
  { question: "¿De qué zona es típico el vino Mencía?", options: ["Ribeira Sacra", "Rías Baixas", "Ribeiro", "Valdeorras"], answer: 0, explanation: "La uva Mencía es la protagonista de los tintos de la Ribeira Sacra." },
  { question: "¿Qué es la 'caldeirada' gallega?", options: ["Guiso de pescado", "Sopa fría", "Postre de leche", "Pan relleno"], answer: 0, explanation: "La caldeirada es un guiso de pescado y patatas, típico de la costa gallega." },
  { question: "¿Qué crustáceo gallego es el más caro del mundo?", options: ["El percebe", "La centolla", "La nécora", "El bogavante"], answer: 0, explanation: "Los percebes gallegos son los más cotizados del mundo por la peligrosidad de su recolección." },
  { question: "¿Qué tipo de pan es típico de Galicia?", options: ["Pan de broa (maíz)", "Pan de centeno", "Pan de espelta", "Focaccia"], answer: 0, explanation: "La broa es el pan de maíz gallego tradicional, cocido en horno de leña." },
  { question: "¿Cómo se llama el licor gallego hecho con café?", options: ["Licor café", "Carajillo", "Café irlandés", "Orujo negro"], answer: 0, explanation: "El licor café es una bebida típica gallega hecha con orujo y café." },
  { question: "¿Qué es el 'Ribeiro' en Galicia?", options: ["Denominación de origen de vino", "Un río", "Un queso", "Un embutido"], answer: 0, explanation: "El Ribeiro es una D.O. de vinos de la provincia de Ourense, una de las más antiguas de España." },
  { question: "¿Cuál es el conjuro típico de la queimada?", options: ["Esconjuro contra las meigas", "Canción de cuna", "Himno gallego", "Oración religiosa"], answer: 0, explanation: "El conjuro de la queimada es un ritual para espantar a las meigas (brujas) gallegas." },
  { question: "¿Qué queso gallego tiene forma de mama?", options: ["Tetilla", "San Simón da Costa", "Arzúa-Ulloa", "Cebreiro"], answer: 0, explanation: "El Queso de Tetilla tiene forma de mama y es uno de los más emblemáticos de Galicia." },
  { question: "¿De qué es la empanada gallega más tradicional?", options: ["De berberechos o atún", "De pollo", "De carne picada", "De espinacas"], answer: 0, explanation: "Las empanadas más tradicionales son de berberechos, atún o zorza (carne adobada)." },
  { question: "¿Qué es el 'lacón' exactamente?", options: ["Pata delantera del cerdo curada", "Jamón ibérico", "Lomo de cerdo", "Costillas ahumadas"], answer: 0, explanation: "El lacón es la pata delantera del cerdo, curada en sal, plato estrella del entroido." },
  { question: "¿En qué mes se celebra la Festa do Marisco en O Grove?", options: ["Octubre", "Agosto", "Diciembre", "Marzo"], answer: 0, explanation: "La Festa do Marisco de O Grove se celebra en octubre y es la más famosa de Galicia." },
  { question: "¿Qué es el queso San Simón da Costa?", options: ["Queso ahumado con forma de pera", "Queso azul", "Queso fresco", "Queso con pimentón"], answer: 0, explanation: "San Simón da Costa es un queso ahumado con corteza dorada y forma de pera o bala." },
  { question: "¿Qué agua mineral gallega es la más famosa?", options: ["Mondariz", "Cabreiroá", "Fontecelta", "Sousas"], answer: 0, explanation: "Mondariz es el agua mineral gallega más conocida internacionalmente." },
  { question: "¿Qué ingrediente diferencia la 'zorza' gallega?", options: ["Pimentón y ajo", "Curry", "Pimienta negra", "Comino"], answer: 0, explanation: "La zorza es carne de cerdo adobada con pimentón y ajo, base del chorizo gallego." },
  { question: "¿Cómo se llama el entroido (carnaval) más famoso de Galicia?", options: ["Entroido de Laza", "Carnaval de Vigo", "Entroido de Santiago", "Carnaval de Ourense"], answer: 0, explanation: "El Entroido de Laza es uno de los más antiguos y salvajes de toda España." },
  { question: "¿Qué marisco se recoge en las bateas de las Rías Baixas?", options: ["Mejillón", "Percebe", "Centolla", "Langosta"], answer: 0, explanation: "Las bateas son estructuras flotantes donde se cultivan mejillones en las Rías Baixas." },
  { question: "¿Cuántas provincias tiene Galicia?", options: ["4", "3", "5", "6"], answer: 0, explanation: "Galicia tiene 4 provincias: A Coruña, Lugo, Ourense y Pontevedra." },
  { question: "¿Qué es la 'rapapolvos' en la gastronomía gallega?", options: ["Un tipo de patata gallega", "Una salsa picante", "Un postre", "Un tipo de pan"], answer: 0, explanation: "La patata rapapolvos o cachelo es la típica patata gallega, ideal para el caldo." },
  { question: "¿Qué festividad se celebra cada año en Betanzos con un globo gigante?", options: ["San Roque", "Santiago Apóstol", "San Juan", "Corpus Christi"], answer: 0, explanation: "En las fiestas de San Roque, Betanzos lanza un enorme globo de papel al cielo." },
  { question: "¿De qué pueblo es original la torta de Mondoñedo?", options: ["Mondoñedo, Lugo", "Mondoñedo, Ourense", "Mondoñedo, A Coruña", "Mondoñedo, Pontevedra"], answer: 0, explanation: "Mondoñedo está en Lugo y su torta es un dulce centenario con cabello de ángel." },
  { question: "¿Qué tipo de centolla se considera la mejor de Galicia?", options: ["La del puerto de O Grove", "La de Vigo", "La de A Coruña", "La de Ferrol"], answer: 0, explanation: "La centolla de O Grove es considerada una de las mejores, con su famosa fiesta en noviembre." },
];

const TRIVIA_ANDALUCIA: TriviaQuestion[] = [
  { question: "¿Cuál es el jamón más famoso de Andalucía?", options: ["Jamón de Jabugo", "Jamón de Teruel", "Jamón Serrano", "Jamón de Trevélez"], answer: 0, explanation: "El jamón ibérico de Jabugo (Huelva) es considerado el mejor del mundo." },
  { question: "¿Qué sopa fría es el plato estrella andaluz en verano?", options: ["Gazpacho", "Salmorejo", "Ajoblanco", "Porra antequerana"], answer: 0, explanation: "El gazpacho es la sopa fría más famosa del mundo, originaria de Andalucía." },
  { question: "¿En qué ciudad está la Alhambra?", options: ["Granada", "Sevilla", "Córdoba", "Málaga"], answer: 0, explanation: "La Alhambra es el palacio nazarí de Granada, Patrimonio de la Humanidad." },
  { question: "¿Qué es el salmorejo?", options: ["Crema espesa de tomate y pan", "Sopa de ajo", "Ensalada de mariscos", "Guiso de bacalao"], answer: 0, explanation: "El salmorejo cordobés es una crema espesa de tomate, pan, ajo y aceite de oliva." },
  { question: "¿Cuál es el vino generoso más famoso de Andalucía?", options: ["Jerez (Sherry)", "Cava", "Albariño", "Txakoli"], answer: 0, explanation: "El Jerez o Sherry es el vino generoso de la comarca de Jerez de la Frontera (Cádiz)." },
  { question: "¿Qué es el pescaíto frito?", options: ["Fritura de pescado en aceite de oliva", "Bacalao ahumado", "Merluza al horno", "Atún marinado"], answer: 0, explanation: "El pescaíto frito es una fritura de pequeños pescados, especialidad malagueña y gaditana." },
  { question: "¿De dónde es originario el flamenco?", options: ["Andalucía", "Extremadura", "Murcia", "Valencia"], answer: 0, explanation: "El flamenco nació en Andalucía y es Patrimonio Cultural Inmaterial de la Humanidad." },
  { question: "¿Qué es el rebujito?", options: ["Manzanilla con Seven Up", "Ron con cola", "Vino tinto con naranja", "Sangría sin fruta"], answer: 0, explanation: "El rebujito es la mezcla de manzanilla (vino fino) con Seven Up, típico de las ferias andaluzas." },
  { question: "¿Qué ingrediente principal lleva el ajoblanco?", options: ["Almendras", "Tomates", "Pimientos", "Garbanzos"], answer: 0, explanation: "El ajoblanco es una sopa fría malagueña a base de almendras, ajo, pan y aceite de oliva." },
  { question: "¿Cuántas provincias tiene Andalucía?", options: ["8", "6", "7", "9"], answer: 0, explanation: "Andalucía tiene 8 provincias: Huelva, Cádiz, Sevilla, Córdoba, Jaén, Málaga, Granada y Almería." },
];

const TRIVIA_CATALUNYA: TriviaQuestion[] = [
  { question: "¿Cuál es el postre catalán que se flamea con azúcar?", options: ["Crema catalana", "Natillas", "Flan de huevo", "Arroz con leche"], answer: 0, explanation: "La crema catalana es el postre más famoso de Cataluña, precursora del crème brûlée." },
  { question: "¿Qué es el pa amb tomàquet?", options: ["Pan con tomate y aceite", "Bocadillo de embutido", "Tostada con queso", "Pan de ajo"], answer: 0, explanation: "El pa amb tomàquet (pan con tomate) es el símbolo culinario de Cataluña." },
  { question: "¿Qué es la calçotada?", options: ["Fiesta con cebollas tiernas asadas", "Festival de vino", "Celebración de la vendimia", "Mercado medieval"], answer: 0, explanation: "La calçotada es la tradición catalana de asar calçots (cebollas tiernas) en el campo." },
  { question: "¿Qué salsa acompaña los calçots?", options: ["Romesco", "Alioli", "Brava", "Pesto"], answer: 0, explanation: "El romesco es la salsa de tomate y almendras que acompaña a los calçots." },
  { question: "¿Cuál es el embutido más típico de Cataluña?", options: ["Fuet", "Chorizo", "Salchichón", "Morcilla"], answer: 0, explanation: "El fuet es un embutido curado estrecho y alargado, símbolo de la charcutería catalana." },
  { question: "¿Qué vino espumoso se produce en Cataluña?", options: ["Cava", "Champán", "Prosecco", "Crémant"], answer: 0, explanation: "El cava es el vino espumoso catalán con denominación de origen propia." },
  { question: "¿En qué ciudad está la Sagrada Familia?", options: ["Barcelona", "Tarragona", "Girona", "Lleida"], answer: 0, explanation: "La Sagrada Família es la basílica de Gaudí en Barcelona, el símbolo arquitectónico catalán." },
  { question: "¿Qué es la botifarra?", options: ["Embutido fresco catalán", "Queso curado", "Pan de maíz", "Pasta rellena"], answer: 0, explanation: "La botifarra es el embutido fresco más tradicional de Cataluña." },
  { question: "¿Cuál es el arroz catalán con tinta de calamar?", options: ["Arròs negre", "Arroz a banda", "Paella valenciana", "Fideuà"], answer: 0, explanation: "El arròs negre (arroz negro) se colorea con tinta de sepia y es especialidad catalana." },
  { question: "¿Qué es la escalivada?", options: ["Verduras asadas al fuego", "Ensalada de legumbres", "Pasta con salsa", "Sopa de pescado"], answer: 0, explanation: "La escalivada son verduras (berenjena, pimiento, cebolla) asadas directamente al fuego." },
];

const TRIVIA_MADRID: TriviaQuestion[] = [
  { question: "¿Cuál es el cocido típico de Madrid?", options: ["Cocido Madrileño", "Puchero", "Fabada", "Olla gitana"], answer: 0, explanation: "El cocido madrileño es el plato estrella de Madrid, con garbanzos, verduras y carnes." },
  { question: "¿Qué bocadillo es inseparable de las verbenas de Madrid?", options: ["Bocadillo de calamares", "Bocadillo de lomo", "Bocadillo de jamón", "Bocadillo de tortilla"], answer: 0, explanation: "El bocadillo de calamares fritos es el símbolo gastronómico del centro de Madrid." },
  { question: "¿Cuál es el postre más popular de Madrid para el desayuno?", options: ["Churros con chocolate", "Croissant", "Tostada con tomate", "Magdalenas"], answer: 0, explanation: "Los churros con chocolate son el desayuno madrileño por excelencia, especialmente en San Ginés." },
  { question: "¿Cuál es el licor típico del municipio de Chinchón?", options: ["Anís de Chinchón", "Ron Miel", "Licor de hierbas", "Whisky de malta"], answer: 0, explanation: "El anís de Chinchón tiene Indicación Geográfica y se produce en ese municipio madrileño." },
  { question: "¿Qué famoso mercado gastronómico hay en el centro de Madrid?", options: ["Mercado de San Miguel", "Mercado de la Boqueria", "Mercado de Triana", "Mercado de Santa Caterina"], answer: 0, explanation: "El Mercado de San Miguel, junto a la Plaza Mayor, es uno de los mercados gastronómicos más famosos." },
  { question: "¿Qué plato se come en la Nochebuena madrileña?", options: ["Besugo al horno", "Cordero asado", "Merluza en salsa", "Cochinillo"], answer: 0, explanation: "El besugo al horno con limón es la tradición navideña por excelencia en Madrid." },
  { question: "¿En qué fiesta se celebra el patrón de Madrid?", options: ["San Isidro (15 mayo)", "San Cayetano (7 agosto)", "La Almudena (9 noviembre)", "San Blas (3 febrero)"], answer: 0, explanation: "San Isidro Labrador es el patrón de Madrid y se celebra con verbenas populares el 15 de mayo." },
  { question: "¿Qué es el 'pisto manchego' que se consume mucho en Madrid?", options: ["Verduras pochadas en aceite", "Embutido curado", "Sopa de carne", "Arroz con leche"], answer: 0, explanation: "El pisto manchego (tomate, pimiento, calabacín, berenjena) es típico también en la cocina madrileña." },
  { question: "¿Cuál es la famosa churrería del centro de Madrid?", options: ["San Ginés", "Casa Mingo", "Casa Botin", "El Brillante"], answer: 0, explanation: "La Chocolatería San Ginés, abierta desde 1894, es la más famosa del mundo." },
  { question: "¿Con qué ingrediente se hace el Madrid típico 'oreja a la madrileña'?", options: ["Oreja de cerdo", "Oreja de ternera", "Orejas de conejo", "Molleja de cordero"], answer: 0, explanation: "La oreja a la madrileña se prepara con oreja de cerdo cocida, frita y con salsa picante." },
];

const TRIVIA_VALENCIA: TriviaQuestion[] = [
  { question: "¿Cuál es el plato más famoso de Valencia?", options: ["Paella valenciana", "Fideuà", "Arroz a banda", "All i pebre"], answer: 0, explanation: "La paella valenciana con pollo, conejo y garrofó es el plato icónico de Valencia y del mundo." },
  { question: "¿Qué ingrediente NO lleva la paella valenciana original?", options: ["Mariscos", "Garrofó (judía blanca)", "Pollo", "Azafrán"], answer: 0, explanation: "La paella valenciana tradicional lleva pollo, conejo, garrofó y judía verde, NUNCA mariscos." },
  { question: "¿Qué bebida refrescante de arroz es típica de Valencia?", options: ["Horchata de chufa", "Orchata de almendra", "Agua de cebada", "Limonada valenciana"], answer: 0, explanation: "La horchata de chufa (xufa en valenciano) es la bebida más representativa de Valencia." },
  { question: "¿Qué es la fideuà?", options: ["Fideos cocinados como paella", "Pasta italiana", "Sopa de fideos", "Fideos al horno"], answer: 0, explanation: "La fideuà es un plato de fideos cocinados en caldero como si fuera paella, típica de Gandía." },
  { question: "¿Cuál es el festival más famoso de Valencia?", options: ["Las Fallas", "La Tomatina", "La Magdalena", "El Moros y Cristianos"], answer: 0, explanation: "Las Fallas (19 marzo) son el festival más icónico de Valencia, declarado Patrimonio de la Humanidad." },
  { question: "¿Qué fruta es símbolo de Valencia en el mundo?", options: ["La naranja", "La mandarina", "El limón", "La clementina"], answer: 0, explanation: "Las naranjas valencianas son famosas en todo el mundo por su dulzor y calidad." },
  { question: "¿Qué es el 'all i pebre'?", options: ["Guiso de anguila con ajo y pimentón", "Salsa de ajo y aceite", "Caldo de marisco", "Sopa fría de ajo"], answer: 0, explanation: "El all i pebre es el guiso tradicional de anguilas de la Albufera de Valencia con ajo y pimentón." },
  { question: "¿Qué es el cóctel 'Agua de Valencia'?", options: ["Zumo de naranja con cava y vodka", "Agua con naranja y limón", "Sangría valenciana", "Vino con gaseosa"], answer: 0, explanation: "El Agua de Valencia es el cóctel icónico de Valencia: zumo de naranja, cava, vodka y ginebra." },
  { question: "¿Cuándo se celebra la Tomatina de Buñol?", options: ["Último miércoles de agosto", "Primer sábado de julio", "15 de agosto", "Primer domingo de septiembre"], answer: 0, explanation: "La Tomatina de Buñol se celebra el último miércoles de agosto y es mundialmente famosa." },
  { question: "¿Qué ingrediente tiñe de negro el arroz negro valenciano?", options: ["Tinta de sepia", "Tinta de calamar", "Colorante alimentario", "Soja"], answer: 1, explanation: "El arroz negro se tiñe con la tinta del calamar, dándole su característico sabor y color." },
];

const TRIVIA_PAIS_VASCO: TriviaQuestion[] = [
  { question: "¿Qué son los pintxos vascos?", options: ["Tapas sobre pan o en brocheta", "Embutidos curados", "Pasteles rellenos", "Quesos artesanales"], answer: 0, explanation: "Los pintxos (pinchos) son tapas vascas servidas sobre pan, base de la cultura gastronómica vasca." },
  { question: "¿Cuál es la técnica del bacalao al pil-pil?", options: ["Gelatina del bacalao emulsionada con aceite", "Bacalao frito con salsa picante", "Bacalao en escabeche", "Bacalao a la brasa"], answer: 0, explanation: "El pil-pil es la técnica de emulsionar la gelatina del bacalao con aceite de oliva y ajo." },
  { question: "¿Qué es el marmitako?", options: ["Guiso de bonito del norte con patatas", "Sopa de alubias rojas", "Caldo de bacalao", "Guiso de cordero"], answer: 0, explanation: "El marmitako es el guiso marinero vasco por excelencia: bonito del norte, patatas y pimiento choricero." },
  { question: "¿Cuál es el vino blanco joven y ácido típico del País Vasco?", options: ["Txakoli", "Albariño", "Godello", "Verdejo"], answer: 0, explanation: "El txakoli (chacolí) es el vino blanco seco y ligeramente efervescente típico del País Vasco." },
  { question: "¿Qué son las txangurro?", options: ["Centollo relleno con su propio caldo", "Almejas a la marinera", "Gambas en salsa", "Langosta a la parrilla"], answer: 0, explanation: "Las txangurro son cangrejos (centollo) rellenos con un sofrito de su propia carne." },
  { question: "¿Cómo se llama la institución gastronómica privada vasca?", options: ["Txoko (sociedad gastronómica)", "Sidrería", "Asador", "Bodega"], answer: 0, explanation: "Los txokos son las sociedades gastronómicas privadas vascas, clubes donde se cocina en sociedad." },
  { question: "¿Cuál es el queso ahumado más famoso del País Vasco?", options: ["Idiazabal", "Roncal", "San Simón", "Manchego"], answer: 0, explanation: "El queso Idiazabal es el queso ahumado de leche de oveja más emblemático del País Vasco." },
  { question: "¿Cuál es la salsa vasca de pimiento rojo seco?", options: ["Salsa vizcaína", "Salsa verde", "Salsa romana", "Salsa negra"], answer: 0, explanation: "La salsa vizcaína se hace con pimiento choricero seco y es base del bacalao a la vizcaína." },
  { question: "¿Qué legumbre es la más famosa del País Vasco?", options: ["Alubias de Tolosa", "Lentejas pardinas", "Garbanzos pedrosillanos", "Judías de El Barco"], answer: 0, explanation: "Las alubias de Tolosa son las judías negras más premiadas de España, típicas de Guipúzcoa." },
  { question: "¿Cuántas estrellas Michelin acumula San Sebastián per cápita?", options: ["La ciudad con más estrellas per cápita del mundo", "Tercera en Europa", "Primera de España", "Segunda del mundo"], answer: 0, explanation: "San Sebastián (Donostia) tiene más estrellas Michelin per cápita que ninguna otra ciudad del mundo." },
];

const TRIVIA_GENERIC_SPAIN: TriviaQuestion[] = [
  { question: "¿Cuántas comunidades autónomas tiene España?", options: ["17", "15", "19", "16"], answer: 0, explanation: "España tiene 17 comunidades autónomas y 2 ciudades autónomas (Ceuta y Melilla)." },
  { question: "¿Cuál es el plato más icónico de la cocina española?", options: ["Tortilla de patatas", "Paella", "Gazpacho", "Cocido"], answer: 0, explanation: "La tortilla española de patatas y huevos es el plato más reconocido internacionalmente." },
  { question: "¿Qué aceite es fundamental en la cocina española?", options: ["Aceite de oliva virgen extra", "Aceite de girasol", "Aceite de sésamo", "Aceite de coco"], answer: 0, explanation: "España es el mayor productor mundial de aceite de oliva, fundamental en toda su cocina." },
  { question: "¿Cuál es el embutido español más famoso en el mundo?", options: ["Jamón ibérico", "Chorizo", "Fuet", "Morcilla"], answer: 0, explanation: "El jamón ibérico de bellota es considerado el embutido más lujoso del mundo." },
  { question: "¿Qué es la sangría?", options: ["Vino tinto con frutas y azúcar", "Vino blanco con gaseosa", "Cerveza con limón", "Cava con naranja"], answer: 0, explanation: "La sangría es la bebida más conocida de España: vino tinto con frutas, azúcar y a veces brandy." },
  { question: "¿De qué ciudad es famoso el mazapán?", options: ["Toledo", "Salamanca", "Burgos", "Segovia"], answer: 0, explanation: "El mazapán de Toledo, hecho con almendra molida y azúcar, es el más famoso de España." },
  { question: "¿Cuántas lenguas cooficiales tiene España?", options: ["4 (castellano, catalán, euskera, gallego)", "3", "2", "5"], answer: 0, explanation: "España tiene 4 lenguas cooficiales: castellano, catalán (valenciano), euskera y gallego." },
  { question: "¿Cuál es el mayor productor de vino de España?", options: ["Castilla-La Mancha", "La Rioja", "Ribera del Duero", "Penedès"], answer: 0, explanation: "Castilla-La Mancha produce más del 50% del vino español por volumen." },
  { question: "¿Cuál es el festival más conocido de España?", options: ["San Fermín (Pamplona)", "Las Fallas (Valencia)", "La Tomatina (Buñol)", "Semana Santa (Sevilla)"], answer: 0, explanation: "El encierro de San Fermín en Pamplona (7 de julio) es el festival español más conocido mundialmente." },
  { question: "¿Qué hace especial el aceite de oliva virgen extra español?", options: ["Acidez menor de 0,8% y máxima calidad", "Está siempre caliente", "Se hace con aceitunas negras únicamente", "Se filtra con agua de mar"], answer: 0, explanation: "El AOVE tiene acidez máxima de 0,8% y se extrae únicamente por medios mecánicos, sin tratamientos." },
];

export const TRIVIA_BY_REGION: Record<string, TriviaQuestion[]> = {
  "galicia": TRIVIA_QUESTIONS,
  "andalucia": TRIVIA_ANDALUCIA,
  "catalunya": TRIVIA_CATALUNYA,
  "madrid": TRIVIA_MADRID,
  "valencia": TRIVIA_VALENCIA,
  "pais-vasco": TRIVIA_PAIS_VASCO,
  "castilla-leon": TRIVIA_GENERIC_SPAIN,
  "aragon": TRIVIA_GENERIC_SPAIN,
  "asturias": TRIVIA_GENERIC_SPAIN,
  "canarias": TRIVIA_GENERIC_SPAIN,
  "cantabria": TRIVIA_GENERIC_SPAIN,
  "castilla-mancha": TRIVIA_GENERIC_SPAIN,
  "extremadura": TRIVIA_GENERIC_SPAIN,
  "murcia": TRIVIA_GENERIC_SPAIN,
  "navarra": TRIVIA_GENERIC_SPAIN,
  "rioja": TRIVIA_GENERIC_SPAIN,
  "baleares": TRIVIA_GENERIC_SPAIN,
};

export function getTriviaQuestionsForRegion(region: string): TriviaQuestion[] {
  return TRIVIA_BY_REGION[region] || TRIVIA_QUESTIONS;
}

export interface MemoryItem {
  id: string;
  emoji: string;
  name: string;
  imageUrl?: string;
}

export const MEMORY_ITEMS: MemoryItem[] = [
  { id: "salpicon", emoji: "🥗", name: "Salpicón", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/r0xuw7mey995fwvestl3p" },
  { id: "mejillones", emoji: "🦪", name: "Mejillones Escabeche", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/rj8nhqi2lmvl9m6snb9wa" },
  { id: "caprese", emoji: "🍅", name: "Caprese", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/rjbv1or9o0973kwaq4yp2" },
  { id: "croquetas", emoji: "🧆", name: "Croquetas", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/e1cxkzu1smk4aebq3q9t1" },
  { id: "coulant", emoji: "🧁", name: "Coulant de Queso", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/9vxkw9s7ljlrfl0szhaiu" },
  { id: "bacalao", emoji: "🐟", name: "Bacalao", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uqnou3to579z13xscwroh" },
  { id: "calamares", emoji: "🦑", name: "Calamares", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/u29s3b5rgauz6gikagx05" },
  { id: "cachopo", emoji: "🥩", name: "Cachopo", imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bw20uz9p8d842oln8pcxo" },
];

export const CUSTOMER_EMOJIS = ["👨", "👩", "👴", "👵", "🧑", "👨‍💼", "👩‍💼", "🧔", "👱", "👩‍🦱"];
export const CUSTOMER_GROUPS = [
  { size: 1, emoji: "🧑" },
  { size: 2, emoji: "👫" },
  { size: 3, emoji: "👨‍👩‍👦" },
  { size: 4, emoji: "👨‍👩‍👧‍👦" },
];

export const HIRE_STAFF_OPTIONS = [
  {
    type: "waiter" as const,
    emoji: "🤵",
    title: "Camarero",
    description: "Atiende mesas automáticamente",
  },
  {
    type: "cook" as const,
    emoji: "👨‍🍳",
    title: "Cocinero",
    description: "Cocina pedidos automáticamente",
  },
];
