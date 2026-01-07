--
-- PostgreSQL database dump
--

-- \restrict Bimkemasn3EJokVyumlMA7qBgQUJPAc3fmH2ks36KzG3AOUNYEmYOmbSDZ6qbyd

-- Dumped from database version 17.6 (Debian 17.6-2.pgdg12+1)
-- Dumped by pg_dump version 18.1 (Ubuntu 18.1-1.pgdg22.04+2)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: cumplimiento_mvp_user
--

-- *not* creating schema, since initdb creates it



SET default_tablespace = '';

SET default_table_access_method = heap;

--
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
    CONSTRAINT alertas_estado_check CHECK (((estado)::text = ANY (ARRAY[('activa'::character varying)::text, ('resuelta'::character varying)::text, ('descartada'::character varying)::text])))
);



--
-- Name: TABLE alertas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.alertas IS 'Alertas generadas por umbrales o perfiles anómalos';


--
-- Name: alertas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.alertas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.alertas_id_seq OWNED BY public.alertas.id;


--
-- Name: barridos_listas; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.barridos_listas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    tipo_lista character varying(30) NOT NULL,
    coincidencia boolean DEFAULT false NOT NULL,
    detalles jsonb,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT barridos_listas_tipo_lista_check CHECK (((tipo_lista)::text = ANY (ARRAY[('ppe'::character varying)::text, ('sanciones'::character varying)::text, ('paises_riesgo'::character varying)::text])))
);



--
-- Name: TABLE barridos_listas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.barridos_listas IS 'Resultados de cotejo contra listas de PPE, sanciones y países de riesgo';


--
-- Name: barridos_listas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.barridos_listas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: barridos_listas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.barridos_listas_id_seq OWNED BY public.barridos_listas.id;


--
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
    estado character varying(20) DEFAULT 'activo'::character varying,
    CONSTRAINT chk_porcentaje_cumplimiento CHECK (((porcentaje_cumplimiento >= 0) AND (porcentaje_cumplimiento <= 100))),
    CONSTRAINT clientes_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying])::text[]))),
    CONSTRAINT clientes_porcentaje_cumplimiento_check CHECK (((porcentaje_cumplimiento >= 0) AND (porcentaje_cumplimiento <= 100))),
    CONSTRAINT clientes_tipo_cliente_check CHECK (((tipo_cliente)::text = ANY (ARRAY[('persona_fisica'::character varying)::text, ('persona_moral'::character varying)::text])))
);



--
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.clientes IS 'Clientes finales asociados a una empresa';


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
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
    estado character varying(20) DEFAULT 'activo'::character varying,
    CONSTRAINT empresas_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying, 'inactivo'::character varying])::text[]))),
    CONSTRAINT empresas_tipo_entidad_check CHECK (((tipo_entidad)::text = ANY (ARRAY[('persona_fisica'::character varying)::text, ('persona_moral'::character varying)::text])))
);



--
-- Name: TABLE empresas; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.empresas IS 'Empresas clientes del sistema (personas físicas o morales)';


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: matrices_riesgo; Type: TABLE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE TABLE public.matrices_riesgo (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    nivel_riesgo character varying(10) NOT NULL,
    puntaje_riesgo integer NOT NULL,
    factores jsonb,
    generado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_nivel_riesgo CHECK (((nivel_riesgo)::text = ANY (ARRAY[('bajo'::character varying)::text, ('medio'::character varying)::text, ('alto'::character varying)::text]))),
    CONSTRAINT matrices_riesgo_nivel_riesgo_check CHECK (((nivel_riesgo)::text = ANY (ARRAY[('bajo'::character varying)::text, ('medio'::character varying)::text, ('alto'::character varying)::text])))
);



--
-- Name: TABLE matrices_riesgo; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.matrices_riesgo IS 'Asignación de nivel de riesgo por cliente';


--
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.matrices_riesgo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.matrices_riesgo_id_seq OWNED BY public.matrices_riesgo.id;


--
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



--
-- Name: TABLE transacciones; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.transacciones IS 'Operaciones mensuales para perfil transaccional';


--
-- Name: transacciones_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.transacciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: transacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.transacciones_id_seq OWNED BY public.transacciones.id;


--
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
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY (ARRAY[('admin'::character varying)::text, ('consultor'::character varying)::text, ('cliente'::character varying)::text])))
);



--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema: admin, consultor, cliente';


--
-- Name: COLUMN usuarios.rol; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON COLUMN public.usuarios.rol IS 'admin: acceso total; consultor: acceso a todas las empresas; cliente: acceso a su empresa';


--
-- Name: COLUMN usuarios.activo; Type: COMMENT; Schema: public; Owner: cumplimiento_mvp_user
--

COMMENT ON COLUMN public.usuarios.activo IS 'Indicador de desactivación lógica (no se borran usuarios por normativa)';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: alertas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas ALTER COLUMN id SET DEFAULT nextval('public.alertas_id_seq'::regclass);


--
-- Name: barridos_listas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas ALTER COLUMN id SET DEFAULT nextval('public.barridos_listas_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: matrices_riesgo id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo ALTER COLUMN id SET DEFAULT nextval('public.matrices_riesgo_id_seq'::regclass);


--
-- Name: transacciones id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones ALTER COLUMN id SET DEFAULT nextval('public.transacciones_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: alertas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.alertas (id, cliente_id, tipo_alerta, descripcion, estado, creado_en, resuelto_en) FROM stdin;
\.


--
-- Data for Name: barridos_listas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.barridos_listas (id, cliente_id, tipo_lista, coincidencia, detalles, creado_en) FROM stdin;
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.clientes (id, empresa_id, cliente_id_externo, nombre_entidad, alias, fecha_nacimiento_constitucion, tipo_cliente, nacionalidad, domicilio_mexico, ocupacion, actividad_economica, datos_completos, porcentaje_cumplimiento, creado_en, actualizado_en, estado) FROM stdin;
2	4	\N	Cliente Prueba Final	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:00:15.048573+00	2025-10-17 22:00:15.048573+00	activo
3	5	\N	Jose Israel Romero Castellanos	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:02:18.448583+00	2025-10-17 22:02:18.448583+00	activo
4	6	\N	Israel Romero Castellanos	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:40:55.610165+00	2025-10-17 22:40:55.610165+00	activo
5	7	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-17 22:43:54.197407+00	2025-10-17 22:43:54.197407+00	activo
6	8	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:09:19.371598+00	2025-10-18 06:09:19.371598+00	activo
7	10	\N	Jose	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:10:15.862858+00	2025-10-18 06:10:15.862858+00	activo
8	11	\N	Cliente Login Prueba	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 06:48:19.096642+00	2025-10-18 06:48:19.096642+00	activo
9	18	\N	Gelatina Geles	\N	\N	persona_fisica	\N	\N	\N	\N	\N	0	2025-10-18 07:21:46.58708+00	2025-10-18 07:21:46.58708+00	activo
10	19	\N	Generico	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	0	2025-10-19 02:14:19.950707+00	2025-10-19 02:14:19.950707+00	activo
11	22	\N	numeros	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	0	2025-10-19 03:02:58.256311+00	2025-10-19 03:02:58.256311+00	activo
12	31	\N	Numero Dos	\N	\N	persona_fisica	\N	\N	\N		\N	0	2025-11-10 04:30:36.456062+00	2025-11-10 04:30:36.456062+00	activo
13	34	\N	Casinos Unidos	Casinos Unidos	2021-03-03	persona_moral	Mexicana	Domicilio Conocido	Servicios de casinos	Apuestas	\N	0	2025-11-12 17:08:03.894582+00	2025-11-12 17:08:03.894582+00	activo
1	1	\N	Juan Pérez	\N	\N	persona_fisica	\N	\N	\N	venta_de_inmuebles	\N	100	2025-10-12 21:34:02.501658+00	2025-11-12 17:08:48.432857+00	activo
14	34	\N	Severo Granados Iglesia	Don Tornillo	1967-02-22	persona_fisica	Mexicana	Conocido 1458	\N	Tornillos	\N	0	2025-11-13 19:15:52.954427+00	2025-11-13 19:15:52.954427+00	activo
15	34	\N	Azulejera de Occidente	AULOCC	2017-06-09	persona_moral	Mexicana	Conocido 98	\N	Azulejos	\N	0	2025-11-13 19:17:48.855749+00	2025-11-13 19:17:48.855749+00	activo
16	34	\N	Aceros Fuertes	AcerFuertes	2015-04-16	persona_moral	Mexicana	Conocido 1458-A	\N	Acero	\N	0	2025-11-13 19:22:25.982229+00	2025-11-13 19:22:25.982229+00	activo
17	34	\N	CONSTRUCTORA STRETU, SAPI DE CV	STRETU 	2019-09-04	persona_moral	MEXICANA	\N	\N	DESARROLLO INMOBILIARIO 	\N	0	2025-11-14 16:39:29.868188+00	2025-11-14 16:39:29.868188+00	activo
18	1	\N	Prueba Final	\N	\N	persona_moral	\N	\N	\N	venta_final	\N	0	2025-11-17 17:04:48.433156+00	2025-11-17 17:04:48.433156+00	activo
20	1	\N	Joyeros de México	\N	\N	persona_moral	\N	\N	\N	venta_de_joyas	\N	0	2025-11-17 18:06:16.774505+00	2025-11-17 18:06:16.774505+00	activo
21	1	\N	Prueba México	\N	\N	persona_moral	\N	\N	\N	venta_pruebas	\N	0	2025-11-17 18:13:23.39744+00	2025-11-17 18:13:23.39744+00	activo
23	1	\N	Transportes Unidos	\N	\N	persona_moral	\N	\N	\N	Transporte	\N	0	2025-11-17 19:04:52.542559+00	2025-11-17 19:04:52.542559+00	activo
24	1	\N	Fernanda Sanch�z	\N	\N	persona_fisica	\N	\N	\N	Servicios m�dicos	\N	0	2025-11-17 19:04:52.542559+00	2025-11-17 19:04:52.542559+00	activo
25	1	\N	Alfonso Avelar	\N	\N	persona_fisica	\N	\N	\N	Consultoria	\N	0	2025-11-17 19:04:52.542559+00	2025-11-17 19:04:52.542559+00	activo
26	1	\N	Destinos Turisticos de Occidente	\N	\N	persona_moral	\N	\N	\N	Hospedaje	\N	0	2025-11-17 19:04:52.542559+00	2025-11-17 19:04:52.542559+00	activo
27	1	\N	Juan Alberto Rodr�guez	\N	\N	persona_fisica	\N	\N	\N	servicios_profesionales	\N	0	2025-11-17 19:04:52.542559+00	2025-11-17 19:04:52.542559+00	activo
28	1	\N	Mecanica Automotriz	\N	\N	persona_moral	\N	\N	\N	servicios_profesionales	\N	0	2025-11-17 20:06:02.299586+00	2025-11-17 20:06:02.299586+00	activo
29	1	\N	Wendy Castro	\N	\N	persona_fisica	\N	\N	\N	Contabilidad	\N	0	2025-11-17 20:06:02.299586+00	2025-11-17 20:06:02.299586+00	activo
30	1	\N	Logistica de Jalisco	\N	\N	persona_moral	\N	\N	\N	Transporte	\N	0	2025-11-17 20:06:02.299586+00	2025-11-17 20:06:02.299586+00	activo
31	1	\N	Deportes de Occidente	\N	\N	persona_moral	\N	\N	\N	Comercio	\N	0	2025-11-17 20:06:02.299586+00	2025-11-17 20:06:02.299586+00	activo
33	1	\N	Comercializadora Tapatia	\N	\N	persona_moral	\N	\N	\N	Comercio mayorista	\N	0	2025-11-17 20:06:02.299586+00	2025-11-17 20:06:02.299586+00	activo
36	1	\N	Prueba2001	Prueba2001	1978-08-10	persona_moral	Mexicana	Centro	\N	Ninguna	\N	0	2025-11-24 21:43:58.354335+00	2025-11-24 21:43:58.354335+00	activo
35	1	\N	Prueba2000	Prueba2000	2001-12-22	persona_fisica	Mexicana	Carretera a Silao #2000	\N	Varias	\N	0	2025-11-24 21:43:58.348641+00	2025-11-24 21:47:29.618429+00	activo
37	1	\N	Prueba24112025	Prueba24112025	2001-12-22	persona_fisica	Mexicana	Carretera a Silao #2000	\N	Varias	\N	0	2025-11-24 22:05:36.880862+00	2025-11-24 22:05:36.880862+00	activo
38	1	\N	Prueba24112025-2	Prueba24112025-2	1978-08-10	persona_moral	Mexicana	Centro	\N	Ninguna	\N	0	2025-11-24 22:05:36.886064+00	2025-11-24 22:05:36.886064+00	activo
39	33	\N	Prueba24112025	Prueba24112025	2001-12-22	persona_fisica	Mexicana	Carretera a Silao #2000	\N	Varias	\N	0	2025-11-24 23:13:26.367276+00	2025-11-24 23:13:26.367276+00	activo
40	33	\N	Prueba24112025-2	Prueba24112025-2	1978-08-10	persona_moral	Mexicana	Centro	\N	Ninguna	\N	0	2025-11-24 23:13:26.373925+00	2025-11-24 23:13:26.373925+00	activo
41	34	\N	Prueba3000	\N	\N	persona_fisica	\N	\N	\N	Inmuebles	\N	0	2025-12-01 19:48:29.278857+00	2025-12-01 19:48:29.278857+00	activo
32	1	\N	Alejandro Medina	\N	\N	persona_fisica	\N	\N	\N	servicios_profesionales	\N	0	2025-11-17 20:06:02.299586+00	2025-12-02 07:32:56.069544+00	activo
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.empresas (id, nombre_legal, rfc, tipo_entidad, pais, domicilio, creado_en, actualizado_en, estado) FROM stdin;
4	Empresa Prueba Final SA	\N	persona_moral	México	\N	2025-10-17 22:00:14.673109+00	2025-10-21 05:07:08.058501+00	activo
5	VissionFirm	\N	persona_moral	México	\N	2025-10-17 22:02:18.098053+00	2025-10-21 05:07:08.058501+00	activo
7	Ntegix	\N	persona_moral	México	\N	2025-10-17 22:43:53.860196+00	2025-10-21 05:07:08.058501+00	activo
13	Empresa Login Prueba SA	\N	persona_moral	México	\N	2025-10-18 06:48:22.112007+00	2025-10-21 05:07:08.058501+00	activo
19	EmpresaGenerica	RFCGenerico	persona_moral	México	\N	2025-10-19 02:14:19.950707+00	2025-10-21 05:07:08.058501+00	activo
22	numerica	numeraria	persona_moral	México	\N	2025-10-19 03:02:58.256311+00	2025-10-21 05:07:08.058501+00	activo
30	Pueba500	prueba500rfc	persona_moral	México	\N	2025-11-09 21:28:15.417737+00	2025-11-09 21:28:15.417737+00	activo
10	Ntegix4	Nit	persona_moral	México	\N	2025-10-18 06:10:15.52855+00	2025-11-09 21:29:03.885864+00	activo
18	Geles	\N	persona_moral	México	\N	2025-10-18 07:21:46.233423+00	2025-11-09 22:20:44.977649+00	activo
11	Empresa Login Prueba SA 1	pruebarfc	persona_moral	México	\N	2025-10-18 06:48:18.314189+00	2025-11-09 22:20:59.515383+00	activo
1	Empresa de Prueba SA de CV	EMP010203ABC	persona_fisica	México	Av. Reforma 123, CDMX	2025-10-12 21:34:02.324591+00	2025-11-10 02:19:15.971527+00	activo
8	NtegixII	\N	persona_moral	México	\N	2025-10-18 06:09:18.977412+00	2025-10-21 05:07:08.058501+00	activo
31	numerica2	\N	persona_moral	México	\N	2025-11-10 04:30:36.456062+00	2025-11-10 04:30:36.456062+00	activo
6	VissionFirm2	\N	persona_moral	México	\N	2025-10-17 22:40:55.215707+00	2025-10-21 05:07:08.058501+00	activo
32	Caviace y Asociados S.C.	CAS010702FR4	persona_moral	México	\N	2025-11-10 22:15:03.525367+00	2025-11-10 22:15:03.525367+00	activo
33	Monocle Inmobiliaria	Conocido	persona_moral	México	\N	2025-11-11 18:14:25.863427+00	2025-11-11 18:14:25.863427+00	activo
34	VissionFirmGuadalajara	Genérico	persona_moral	México	\N	2025-11-11 19:13:29.170305+00	2025-11-11 19:13:29.170305+00	activo
\.


--
-- Data for Name: matrices_riesgo; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.matrices_riesgo (id, cliente_id, nivel_riesgo, puntaje_riesgo, factores, generado_en) FROM stdin;
\.


--
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.transacciones (id, cliente_id, monto, moneda, fecha_operacion, tipo_operacion, datos_adicionales, creado_en) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: cumplimiento_mvp_user
--

COPY public.usuarios (id, email, password_hash, nombre_completo, rol, empresa_id, creado_en, actualizado_en, activo) FROM stdin;
8	prueba@ntegix.com	$2b$10$amn/wjOnOc8cnSxz9lGHMOE3GZKGeBW41efHJp2QhbcdbXXpAbQs.	Usuario Jose	cliente	10	2025-10-18 06:10:15.859876+00	2025-10-18 06:10:15.859876+00	t
9	loginprueba1@empresa.com	$2b$10$ewWpR8x1DThZaMA46aNinePkBZkHyOTi3dCTEqU7HfOjzpSYVSpce	Usuario Cliente Login Prueba	cliente	11	2025-10-18 06:48:19.093726+00	2025-10-18 06:48:19.093726+00	t
16	prueba@prueba.com	$2b$10$i5.NxEgWyvmsMCySoTElOOURpgULzWwoXqV.P6El3GchYyO9S7Gh6	Usuario Gelatina Geles	cliente	18	2025-10-18 07:21:46.583972+00	2025-10-18 07:21:46.583972+00	t
17	pruebatercera@correo.com	$2b$10$HrI9BRuH29VzjASzwyJ/OOxPTlgWEUZHIx8IFNZBCHOyg0GKnffp6	Generico	cliente	19	2025-10-19 02:14:19.950707+00	2025-10-19 02:14:19.950707+00	t
28	admin@cumplimiento.com	$2b$10$sLyX/4y/x2ktp1uKaoTHou3MiU1FsbI2Syl3wqf.9hOupSf9Gv9Om	Administrador del Sistema	admin	\N	2025-10-19 03:29:06.46518+00	2025-10-19 03:29:06.46518+00	t
20	numero1@servicio.com	$2b$10$tkzJWS1pfKukhIgtxJfJZ.O2KQsDamQru1pyYW0ukXGIayK/Y2Dom	Numero Uno	cliente	22	2025-10-19 03:02:58.256311+00	2025-11-03 23:03:55.5518+00	t
30	pruebas@probando.com	$2b$10$JbHMwu8bnMs6CQi//DImcOTxGdP0rHPJLd5r33z9T5ksea/YrmjFe	Elisa Rodriguez	cliente	18	2025-11-09 21:44:46.597499+00	2025-11-09 21:46:10.377949+00	t
32	admin@empresa.com	$2b$10$42jY5B7fiWPbGtHBvqC32.h5jEu8OcgjFruK/YvCcUjPwH/Bi0Pfi	Rosario Castellanos	cliente	18	2025-11-09 21:52:21.616436+00	2025-11-09 21:58:45.045877+00	t
6	prueba1	$2b$10$ZOqZJ/158CiUl94ur192SuvFpiL1DuZPNT9tXGmKVr8AMu9YRpLr6	Verficicar	cliente	8	2025-10-18 06:09:19.368513+00	2025-11-09 22:06:04.381551+00	t
2	prueba.final@empresa.com.mx	$2b$10$9SMim5nmOgwEaIWznMsmB.fgKPUxNbORSU4m/wQUcWpNDOeP2qi4W	123Repitaotra Vez	cliente	4	2025-10-17 22:00:15.045377+00	2025-11-09 22:17:40.087391+00	t
33	nuevo@novedad.com	$2b$10$8/foUJyeMX4LvyRDCnOttu1upNnwt/yubVOgd58x2.2G0P2HJka3O	Jose Israel Romero Castaellanos	cliente	18	2025-11-09 21:57:35.603568+00	2025-11-10 04:26:59.754451+00	t
31	opalacios@vissionfirm.com	$2b$10$WhY6v2Wujb7OQpwW79t7le.u.eqcsCeIfsZXVRo5HCDUI3wLD411m	Oscar Rodrigo Palacios	consultor	\N	2025-11-09 21:47:26.715906+00	2025-11-09 21:47:26.715906+00	t
34	numero2@servicio.com	$2b$10$h0wWEcInEAYdM0KGZN9kpuKOhuy4XAE9PUKiMbXkJwP45cjzdXkr.	Numero Dos	cliente	22	2025-11-10 04:30:36.456062+00	2025-11-10 22:11:45.591355+00	t
35	cgomez@casaadministraciones.com	$2b$10$4EN8T51Vfbv5XNyRTltG5O4YcPMBloQVpdxTeZxO/EL6nYyOwvIF2	Caviace y Asociados S.C.	cliente	32	2025-11-10 22:15:53.703237+00	2025-11-10 22:15:53.703237+00	t
38	hzamora@vissionfirm.com	$2b$10$V6O78CxGlR6mCy7h8/cKnOSm3I.VNw7VHgLz1lQ4TYE995npEDlbW	Hanssel Zamora	cliente	34	2025-11-11 19:16:30.570703+00	2025-11-11 19:16:30.570703+00	t
39	hrayas@vissionfirm.com	$2b$10$Tt7aLESkm1lM69E0yzAYne9UflEINhC4Wv6vVs5IViMZ6g8ZLsbd.	Héctor David Rayas Santillán	cliente	34	2025-11-11 19:18:17.773184+00	2025-11-11 19:18:17.773184+00	t
36	danielromeroc77@gmail.com	$2b$10$b/ePU.0Ze//E9FICRri4bOncU.uPFLhDEPA/foaxg6y.bwqkxwn9y	Daniel Romero Castellanos	cliente	33	2025-11-11 18:16:09.99372+00	2025-11-11 18:16:09.99372+00	t
1	cliente@prueba.com	$2b$10$abcdefghijklmnopqrstuv	Cliente de Prueba	cliente	1	2025-10-12 21:34:02.413386+00	2025-12-01 04:50:40.479621+00	t
37	moncamposllera@vissionfirm.com	$2b$10$25jgPAYyo4qTcrL4dTlkkOBviFTC5OMRsahZWBcCEe4QrVR6QifHm	Montserrat Camposllera	cliente	34	2025-11-11 19:14:53.360466+00	2025-12-01 16:04:18.939813+00	t
5	israelrc@ntegix.com	$2b$10$vvlPzWWGnJ3ojo8VpxCQv.5fnRB1EdNugv8D9QZE9TZRxVrwQKLBK	Usuario Jose	cliente	7	2025-10-17 22:43:54.110867+00	2025-12-01 16:04:24.723491+00	t
4	iromero@vissionfirm.com	$2b$10$nAtXO2Nejlf8GIPF.o/w1uh28RhgOJA.32u0kXQX/WVuc/TduU102	Israel Romero Castellanos	cliente	6	2025-10-17 22:40:55.606411+00	2025-12-01 19:49:56.214354+00	t
3	israelrc@gmail.com	$2b$10$pLT63iPZDlsEu84B7iOn.O9h.RwW4MvZJD/kNRKngA88mHoBaCXsO	Jose Israel Romero Castellanos	cliente	5	2025-10-17 22:02:18.445217+00	2025-12-01 19:50:13.697766+00	t
\.


--
-- Name: alertas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.alertas_id_seq', 1, false);


--
-- Name: barridos_listas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.barridos_listas_id_seq', 1, false);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.clientes_id_seq', 41, true);


--
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.empresas_id_seq', 34, true);


--
-- Name: matrices_riesgo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.matrices_riesgo_id_seq', 1, false);


--
-- Name: transacciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.transacciones_id_seq', 1, false);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cumplimiento_mvp_user
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 39, true);


--
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- Name: barridos_listas barridos_listas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas
    ADD CONSTRAINT barridos_listas_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: matrices_riesgo matrices_riesgo_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo
    ADD CONSTRAINT matrices_riesgo_pkey PRIMARY KEY (id);


--
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_alertas_activas; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_alertas_activas ON public.alertas USING btree (estado) WHERE ((estado)::text = 'activa'::text);


--
-- Name: idx_clientes_empresa; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_clientes_empresa ON public.clientes USING btree (empresa_id);


--
-- Name: idx_clientes_empresa_nombre; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE UNIQUE INDEX idx_clientes_empresa_nombre ON public.clientes USING btree (empresa_id, nombre_entidad);


--
-- Name: idx_empresas_nombre; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE UNIQUE INDEX idx_empresas_nombre ON public.empresas USING btree (nombre_legal);


--
-- Name: idx_empresas_rfc; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE UNIQUE INDEX idx_empresas_rfc ON public.empresas USING btree (rfc) WHERE (rfc IS NOT NULL);


--
-- Name: idx_transacciones_cliente; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_transacciones_cliente ON public.transacciones USING btree (cliente_id);


--
-- Name: idx_transacciones_fecha; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_transacciones_fecha ON public.transacciones USING btree (fecha_operacion);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_rol_activo; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_rol_activo ON public.usuarios USING btree (rol, activo);


--
-- Name: idx_usuarios_rol_empresa; Type: INDEX; Schema: public; Owner: cumplimiento_mvp_user
--

CREATE INDEX idx_usuarios_rol_empresa ON public.usuarios USING btree (rol, empresa_id);


--
-- Name: alertas alertas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: barridos_listas barridos_listas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.barridos_listas
    ADD CONSTRAINT barridos_listas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: clientes clientes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: matrices_riesgo matrices_riesgo_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.matrices_riesgo
    ADD CONSTRAINT matrices_riesgo_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: transacciones transacciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cumplimiento_mvp_user
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO cumplimiento_mvp_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO cumplimiento_mvp_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO cumplimiento_mvp_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO cumplimiento_mvp_user;


--
-- PostgreSQL database dump complete
--

\unrestrict Bimkemasn3EJokVyumlMA7qBgQUJPAc3fmH2ks36KzG3AOUNYEmYOmbSDZ6qbyd

