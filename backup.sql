--
-- PostgreSQL database dump
--

\restrict cAfihOUT9NxISKfkI4nfEAPRHlFGmxIbhN0HusLz7addehvK3ajVWUoCIALmlGs

-- Dumped from database version 17.6 (Debian 17.6-2.pgdg12+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-2.pgdg22.04+1)

-- Started on 2025-11-08 16:30:40 CST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: cumplimiento_mvp_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO cumplimiento_mvp_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 16600)
-- Name: alertas; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.alertas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    tipo_alerta character varying(50) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activa'::character varying,
    creado_en timestamp with time zone DEFAULT now(),
    resuelto_en timestamp with time zone,
    CONSTRAINT alertas_estado_check CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'resuelta'::character varying, 'descartada'::character varying])::text[])))
);


ALTER TABLE public.alertas OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3469 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE alertas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.alertas IS 'Alertas generadas por umbrales o perfiles anómalos';


--
-- TOC entry 229 (class 1259 OID 16599)
-- Name: alertas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.alertas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alertas_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3470 (class 0 OID 0)
-- Dependencies: 229
-- Name: alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.alertas_id_seq OWNED BY public.alertas.id;


--
-- TOC entry 226 (class 1259 OID 16567)
-- Name: barridos_listas; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.barridos_listas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    tipo_lista character varying(30) NOT NULL,
    coincidencia boolean DEFAULT false NOT NULL,
    detalles jsonb,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT barridos_listas_tipo_lista_check CHECK (((tipo_lista)::text = ANY ((ARRAY['ppe'::character varying, 'sanciones'::character varying, 'paises_riesgo'::character varying])::text[])))
);


ALTER TABLE public.barridos_listas OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3471 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE barridos_listas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.barridos_listas IS 'Resultados de cotejo contra listas de PPE, sanciones y países de riesgo';


--
-- TOC entry 225 (class 1259 OID 16566)
-- Name: barridos_listas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.barridos_listas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.barridos_listas_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3472 (class 0 OID 0)
-- Dependencies: 225
-- Name: barridos_listas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.barridos_listas_id_seq OWNED BY public.barridos_listas.id;


--
-- TOC entry 222 (class 1259 OID 16531)
-- Name: clientes; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    cliente_id_externo character varying(100),
    nombre_entidad character varying(255) NOT NULL,
    alias character varying(255),
    fecha_nacimiento_constitucion date,
    tipo_cliente character varying(20) NOT NULL,
    nacionalidad character varying(100),
    domicilio_mexico text,
    ocupacion character varying(255),
    actividad_economica character varying(255),
    datos_completos jsonb,
    porcentaje_cumplimiento integer DEFAULT 0,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_porcentaje_cumplimiento CHECK (((porcentaje_cumplimiento >= 0) AND (porcentaje_cumplimiento <= 100))),
    CONSTRAINT clientes_porcentaje_cumplimiento_check CHECK (((porcentaje_cumplimiento >= 0) AND (porcentaje_cumplimiento <= 100))),
    CONSTRAINT clientes_tipo_cliente_check CHECK (((tipo_cliente)::text = ANY ((ARRAY['persona_fisica'::character varying, 'persona_moral'::character varying])::text[])))
);


ALTER TABLE public.clientes OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3473 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.clientes IS 'Clientes finales asociados a una empresa';


--
-- TOC entry 221 (class 1259 OID 16530)
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3474 (class 0 OID 0)
-- Dependencies: 221
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- TOC entry 220 (class 1259 OID 16519)
-- Name: empresas; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre_legal character varying(255) NOT NULL,
    rfc character varying(20),
    tipo_entidad character varying(20) DEFAULT 'persona_moral'::character varying,
    pais character varying(100) DEFAULT 'México'::character varying,
    domicilio text,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT empresas_tipo_entidad_check CHECK (((tipo_entidad)::text = ANY ((ARRAY['persona_fisica'::character varying, 'persona_moral'::character varying])::text[])))
);


ALTER TABLE public.empresas OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3475 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE empresas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.empresas IS 'Empresas clientes del sistema (personas físicas o morales)';


--
-- TOC entry 219 (class 1259 OID 16518)
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresas_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3476 (class 0 OID 0)
-- Dependencies: 219
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- TOC entry 228 (class 1259 OID 16584)
-- Name: matrices_riesgo; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.matrices_riesgo (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    nivel_riesgo character varying(10) NOT NULL,
    puntaje_riesgo integer NOT NULL,
    factores jsonb,
    generado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_nivel_riesgo CHECK (((nivel_riesgo)::text = ANY ((ARRAY['bajo'::character varying, 'medio'::character varying, 'alto'::character varying])::text[]))),
    CONSTRAINT matrices_riesgo_nivel_riesgo_check CHECK (((nivel_riesgo)::text = ANY ((ARRAY['bajo'::character varying, 'medio'::character varying, 'alto'::character varying])::text[])))
);


ALTER TABLE public.matrices_riesgo OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3477 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE matrices_riesgo; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.matrices_riesgo IS 'Asignación de nivel de riesgo por cliente';


--
-- TOC entry 227 (class 1259 OID 16583)
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.matrices_riesgo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matrices_riesgo_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3478 (class 0 OID 0)
-- Dependencies: 227
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.matrices_riesgo_id_seq OWNED BY public.matrices_riesgo.id;


--
-- TOC entry 224 (class 1259 OID 16551)
-- Name: transacciones; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.transacciones (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    monto numeric(15,2) NOT NULL,
    moneda character varying(3) DEFAULT 'MXN'::character varying,
    fecha_operacion date NOT NULL,
    tipo_operacion character varying(100),
    datos_adicionales jsonb,
    creado_en timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transacciones OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3479 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE transacciones; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.transacciones IS 'Operaciones mensuales para perfil transaccional';


--
-- TOC entry 223 (class 1259 OID 16550)
-- Name: transacciones_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.transacciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transacciones_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3480 (class 0 OID 0)
-- Dependencies: 223
-- Name: transacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.transacciones_id_seq OWNED BY public.transacciones.id;


--
-- TOC entry 218 (class 1259 OID 16504)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    empresa_id integer,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    activo boolean DEFAULT true,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['admin'::character varying, 'consultor'::character varying, 'cliente'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3481 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema: admin, consultor, cliente';


--
-- TOC entry 3482 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN usuarios.rol; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON COLUMN public.usuarios.rol IS 'admin: acceso total; consultor: acceso a todas las empresas; cliente: acceso a su empresa';


--
-- TOC entry 3483 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN usuarios.activo; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON COLUMN public.usuarios.activo IS 'Indicador de desactivación lógica (no se borran usuarios por normativa)';


--
-- TOC entry 217 (class 1259 OID 16503)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO cumplimiento_mvp_user;

--
-- TOC entry 3484 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 3265 (class 2604 OID 16603)
-- Name: alertas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas ALTER COLUMN id SET DEFAULT nextval('public.alertas_id_seq'::regclass);


--
-- TOC entry 3260 (class 2604 OID 16570)
-- Name: barridos_listas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas ALTER COLUMN id SET DEFAULT nextval('public.barridos_listas_id_seq'::regclass);


--
-- TOC entry 3253 (class 2604 OID 16534)
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- TOC entry 3248 (class 2604 OID 16522)
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- TOC entry 3263 (class 2604 OID 16587)
-- Name: matrices_riesgo id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo ALTER COLUMN id SET DEFAULT nextval('public.matrices_riesgo_id_seq'::regclass);


--
-- TOC entry 3257 (class 2604 OID 16554)
-- Name: transacciones id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones ALTER COLUMN id SET DEFAULT nextval('public.transacciones_id_seq'::regclass);


--
-- TOC entry 3244 (class 2604 OID 16507)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 3463 (class 0 OID 16600)
-- Dependencies: 230
-- Data for Name: alertas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.alertas (id, cliente_id, tipo_alerta, descripcion, estado, creado_en, resuelto_en) FROM stdin;
\.


--
-- TOC entry 3459 (class 0 OID 16567)
-- Dependencies: 226
-- Data for Name: barridos_listas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.barridos_listas (id, cliente_id, tipo_lista, coincidencia, detalles, creado_en) FROM stdin;
\.


--
-- TOC entry 3455 (class 0 OID 16531)
-- Dependencies: 222
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.clientes (id, empresa_id, cliente_id_externo, nombre_entidad, alias, fecha_nacimiento_constitucion, tipo_cliente, nacionalidad, domicilio_mexico, ocupacion, actividad_economica, datos_completos, porcentaje_cumplimiento, creado_en, actualizado_en) FROM stdin;
1	1	\N	Juan Pérez	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	100	2025-10-12 21:34:02.501658+00	2025-10-12 21:34:02.501658+00
2	4	\N	Cliente Prueba Final	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:00:15.048573+00	2025-10-17 22:00:15.048573+00
3	5	\N	Jose Israel Romero Castellanos	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:02:18.448583+00	2025-10-17 22:02:18.448583+00
4	6	\N	Israel Romero Castellanos	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:40:55.610165+00	2025-10-17 22:40:55.610165+00
5	7	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:43:54.197407+00	2025-10-17 22:43:54.197407+00
6	8	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:09:19.371598+00	2025-10-18 06:09:19.371598+00
7	10	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:10:15.862858+00	2025-10-18 06:10:15.862858+00
8	11	\N	Cliente Login Prueba	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:48:19.096642+00	2025-10-18 06:48:19.096642+00
9	18	\N	Gelatina Geles	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 07:21:46.58708+00	2025-10-18 07:21:46.58708+00
10	19	\N	Generico	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	0	2025-10-19 02:14:19.950707+00	2025-10-19 02:14:19.950707+00
11	22	\N	numeros	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	0	2025-10-19 03:02:58.256311+00	2025-10-19 03:02:58.256311+00
\.


--
-- TOC entry 3453 (class 0 OID 16519)
-- Dependencies: 220
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.empresas (id, nombre_legal, rfc, tipo_entidad, pais, domicilio, creado_en, actualizado_en) FROM stdin;
1	Empresa de Prueba SA de CV	EMP010203ABC	persona_moral	México	Av. Reforma 123, CDMX	2025-10-12 21:34:02.324591+00	2025-10-21 05:07:08.058501+00
4	Empresa Prueba Final SA	\N	persona_moral	México	\N	2025-10-17 22:00:14.673109+00	2025-10-21 05:07:08.058501+00
5	VissionFirm	\N	persona_moral	México	\N	2025-10-17 22:02:18.098053+00	2025-10-21 05:07:08.058501+00
6	VissionFirm	\N	persona_moral	México	\N	2025-10-17 22:40:55.215707+00	2025-10-21 05:07:08.058501+00
7	Ntegix	\N	persona_moral	México	\N	2025-10-17 22:43:53.860196+00	2025-10-21 05:07:08.058501+00
8	Ntegix	\N	persona_moral	México	\N	2025-10-18 06:09:18.977412+00	2025-10-21 05:07:08.058501+00
9	Ntegix	\N	persona_moral	México	\N	2025-10-18 06:09:19.4741+00	2025-10-21 05:07:08.058501+00
10	Ntegix	\N	persona_moral	México	\N	2025-10-18 06:10:15.52855+00	2025-10-21 05:07:08.058501+00
11	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:48:18.314189+00	2025-10-21 05:07:08.058501+00
12	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:48:18.39448+00	2025-10-21 05:07:08.058501+00
13	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:48:22.112007+00	2025-10-21 05:07:08.058501+00
14	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:48:24.01829+00	2025-10-21 05:07:08.058501+00
15	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:49:22.930285+00	2025-10-21 05:07:08.058501+00
16	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 07:20:51.992922+00	2025-10-21 05:07:08.058501+00
17	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 07:20:52.33602+00	2025-10-21 05:07:08.058501+00
18	Geles	\N	persona_moral	México	\N	2025-10-18 07:21:46.233423+00	2025-10-21 05:07:08.058501+00
19	EmpresaGenerica	RFCGenerico	persona_moral	México	\N	2025-10-19 02:14:19.950707+00	2025-10-21 05:07:08.058501+00
22	numerica	numeraria	persona_moral	México	\N	2025-10-19 03:02:58.256311+00	2025-10-21 05:07:08.058501+00
\.


--
-- TOC entry 3461 (class 0 OID 16584)
-- Dependencies: 228
-- Data for Name: matrices_riesgo; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.matrices_riesgo (id, cliente_id, nivel_riesgo, puntaje_riesgo, factores, generado_en) FROM stdin;
\.


--
-- TOC entry 3457 (class 0 OID 16551)
-- Dependencies: 224
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.transacciones (id, cliente_id, monto, moneda, fecha_operacion, tipo_operacion, datos_adicionales, creado_en) FROM stdin;
\.


--
-- TOC entry 3451 (class 0 OID 16504)
-- Dependencies: 218
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.usuarios (id, email, password_hash, nombre_completo, rol, empresa_id, creado_en, actualizado_en, activo) FROM stdin;
1	cliente@prueba.com	$2b$10$abcdefghijklmnopqrstuv	Cliente de Prueba	cliente	1	2025-10-12 21:34:02.413386+00	2025-10-12 21:34:02.413386+00	t
2	prueba.final@empresa.com	$2b$10$9SMim5nmOgwEaIWznMsmB.fgKPUxNbORSU4m/wQUcWpNDOeP2qi4W	Usuario Cliente Prueba Final	cliente	4	2025-10-17 22:00:15.045377+00	2025-10-17 22:00:15.045377+00	t
3	israelrc@gmail.com	$2b$10$pLT63iPZDlsEu84B7iOn.O9h.RwW4MvZJD/kNRKngA88mHoBaCXsO	Usuario Jose Israel Romero Castellanos	cliente	5	2025-10-17 22:02:18.445217+00	2025-10-17 22:02:18.445217+00	t
4	iromero@vissionfirm.com	$2b$10$nAtXO2Nejlf8GIPF.o/w1uh28RhgOJA.32u0kXQX/WVuc/TduU102	Usuario Israel Romero Castellanos	cliente	6	2025-10-17 22:40:55.606411+00	2025-10-17 22:40:55.606411+00	t
5	israelrc@ntegix.com	$2b$10$vvlPzWWGnJ3ojo8VpxCQv.5fnRB1EdNugv8D9QZE9TZRxVrwQKLBK	Usuario Jose	cliente	7	2025-10-17 22:43:54.110867+00	2025-10-17 22:43:54.110867+00	t
6	prueba1	$2b$10$ZOqZJ/158CiUl94ur192SuvFpiL1DuZPNT9tXGmKVr8AMu9YRpLr6	Usuario Jose	cliente	8	2025-10-18 06:09:19.368513+00	2025-10-18 06:09:19.368513+00	t
8	prueba@ntegix.com	$2b$10$amn/wjOnOc8cnSxz9lGHMOE3GZKGeBW41efHJp2QhbcdbXXpAbQs.	Usuario Jose	cliente	10	2025-10-18 06:10:15.859876+00	2025-10-18 06:10:15.859876+00	t
9	loginprueba1@empresa.com	$2b$10$ewWpR8x1DThZaMA46aNinePkBZkHyOTi3dCTEqU7HfOjzpSYVSpce	Usuario Cliente Login Prueba	cliente	11	2025-10-18 06:48:19.093726+00	2025-10-18 06:48:19.093726+00	t
16	prueba@prueba.com	$2b$10$i5.NxEgWyvmsMCySoTElOOURpgULzWwoXqV.P6El3GchYyO9S7Gh6	Usuario Gelatina Geles	cliente	18	2025-10-18 07:21:46.583972+00	2025-10-18 07:21:46.583972+00	t
17	pruebatercera@correo.com	$2b$10$HrI9BRuH29VzjASzwyJ/OOxPTlgWEUZHIx8IFNZBCHOyg0GKnffp6	Generico	cliente	19	2025-10-19 02:14:19.950707+00	2025-10-19 02:14:19.950707+00	t
28	admin@cumplimiento.com	$2b$10$sLyX/4y/x2ktp1uKaoTHou3MiU1FsbI2Syl3wqf.9hOupSf9Gv9Om	Administrador del Sistema	admin	\N	2025-10-19 03:29:06.46518+00	2025-10-19 03:29:06.46518+00	t
20	numero1@servicio.com	$2b$10$tkzJWS1pfKukhIgtxJfJZ.O2KQsDamQru1pyYW0ukXGIayK/Y2Dom	Numero Uno	cliente	22	2025-10-19 03:02:58.256311+00	2025-11-03 23:03:55.5518+00	t
\.


--
-- TOC entry 3485 (class 0 OID 0)
-- Dependencies: 229
-- Name: alertas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.alertas_id_seq', 1, false);


--
-- TOC entry 3486 (class 0 OID 0)
-- Dependencies: 225
-- Name: barridos_listas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.barridos_listas_id_seq', 1, false);


--
-- TOC entry 3487 (class 0 OID 0)
-- Dependencies: 221
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.clientes_id_seq', 11, true);


--
-- TOC entry 3488 (class 0 OID 0)
-- Dependencies: 219
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.empresas_id_seq', 29, true);


--
-- TOC entry 3489 (class 0 OID 0)
-- Dependencies: 227
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.matrices_riesgo_id_seq', 1, false);


--
-- TOC entry 3490 (class 0 OID 0)
-- Dependencies: 223
-- Name: transacciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.transacciones_id_seq', 1, false);


--
-- TOC entry 3491 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 29, true);


--
-- TOC entry 3298 (class 2606 OID 16610)
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- TOC entry 3294 (class 2606 OID 16577)
-- Name: barridos_listas barridos_listas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas
    ADD CONSTRAINT barridos_listas_pkey PRIMARY KEY (id);


--
-- TOC entry 3287 (class 2606 OID 16543)
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- TOC entry 3285 (class 2606 OID 16529)
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- TOC entry 3296 (class 2606 OID 16593)
-- Name: matrices_riesgo matrices_riesgo_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo
    ADD CONSTRAINT matrices_riesgo_pkey PRIMARY KEY (id);


--
-- TOC entry 3292 (class 2606 OID 16560)
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id);


--
-- TOC entry 3281 (class 2606 OID 16516)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 3283 (class 2606 OID 16514)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 3299 (class 1259 OID 16622)
-- Name: idx_alertas_activas; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_alertas_activas ON public.alertas USING btree (estado) WHERE ((estado)::text = 'activa'::text);


--
-- TOC entry 3288 (class 1259 OID 16549)
-- Name: idx_clientes_empresa; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_clientes_empresa ON public.clientes USING btree (empresa_id);


--
-- TOC entry 3289 (class 1259 OID 16620)
-- Name: idx_transacciones_cliente; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_transacciones_cliente ON public.transacciones USING btree (cliente_id);


--
-- TOC entry 3290 (class 1259 OID 16621)
-- Name: idx_transacciones_fecha; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_transacciones_fecha ON public.transacciones USING btree (fecha_operacion);


--
-- TOC entry 3277 (class 1259 OID 16618)
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- TOC entry 3278 (class 1259 OID 16619)
-- Name: idx_usuarios_rol_activo; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_rol_activo ON public.usuarios USING btree (rol, activo);


--
-- TOC entry 3279 (class 1259 OID 16517)
-- Name: idx_usuarios_rol_empresa; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_rol_empresa ON public.usuarios USING btree (rol, empresa_id);


--
-- TOC entry 3304 (class 2606 OID 16611)
-- Name: alertas alertas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- TOC entry 3302 (class 2606 OID 16578)
-- Name: barridos_listas barridos_listas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas
    ADD CONSTRAINT barridos_listas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- TOC entry 3300 (class 2606 OID 16544)
-- Name: clientes clientes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- TOC entry 3303 (class 2606 OID 16594)
-- Name: matrices_riesgo matrices_riesgo_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo
    ADD CONSTRAINT matrices_riesgo_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- TOC entry 3301 (class 2606 OID 16561)
-- Name: transacciones transacciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- TOC entry 2075 (class 826 OID 16391)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO cumplimiento_mvp_user;


--
-- TOC entry 2077 (class 826 OID 16393)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO cumplimiento_mvp_user;


--
-- TOC entry 2076 (class 826 OID 16392)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO cumplimiento_mvp_user;


--
-- TOC entry 2074 (class 826 OID 16390)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO cumplimiento_mvp_user;


-- Completed on 2025-11-08 16:30:49 CST

--
-- PostgreSQL database dump complete
--

\unrestrict cAfihOUT9NxISKfkI4nfEAPRHlFGmxIbhN0HusLz7addehvK3ajVWUoCIALmlGs

