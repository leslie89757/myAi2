--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: guzhenqiang
--

CREATE TYPE public."UserRole" AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public."UserRole" OWNER TO guzhenqiang;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."Admin" (
    id integer NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "apiKey" text,
    role text DEFAULT 'admin'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Admin" OWNER TO guzhenqiang;

--
-- Name: Admin_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."Admin_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Admin_id_seq" OWNER TO guzhenqiang;

--
-- Name: Admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."Admin_id_seq" OWNED BY public."Admin".id;


--
-- Name: BlacklistedToken; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."BlacklistedToken" (
    id integer NOT NULL,
    token character varying(512) NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BlacklistedToken" OWNER TO guzhenqiang;

--
-- Name: BlacklistedToken_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."BlacklistedToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."BlacklistedToken_id_seq" OWNER TO guzhenqiang;

--
-- Name: BlacklistedToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."BlacklistedToken_id_seq" OWNED BY public."BlacklistedToken".id;


--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    role character varying(50) NOT NULL,
    content text NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO guzhenqiang;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."RefreshToken" (
    id integer NOT NULL,
    token character varying(512) NOT NULL,
    "userId" integer NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO guzhenqiang;

--
-- Name: RefreshToken_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."RefreshToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."RefreshToken_id_seq" OWNER TO guzhenqiang;

--
-- Name: RefreshToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."RefreshToken_id_seq" OWNED BY public."RefreshToken".id;


--
-- Name: Session; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    "userId" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "adminId" integer
);


ALTER TABLE public."Session" OWNER TO guzhenqiang;

--
-- Name: SystemConfig; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."SystemConfig" (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemConfig" OWNER TO guzhenqiang;

--
-- Name: SystemConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."SystemConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."SystemConfig_id_seq" OWNER TO guzhenqiang;

--
-- Name: SystemConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."SystemConfig_id_seq" OWNED BY public."SystemConfig".id;


--
-- Name: SystemPrompt; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."SystemPrompt" (
    id integer NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemPrompt" OWNER TO guzhenqiang;

--
-- Name: SystemPrompt_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."SystemPrompt_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."SystemPrompt_id_seq" OWNER TO guzhenqiang;

--
-- Name: SystemPrompt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."SystemPrompt_id_seq" OWNED BY public."SystemPrompt".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role public."UserRole" DEFAULT 'user'::public."UserRole" NOT NULL,
    "apiKey" character varying(255),
    "apiKeyUsage" integer DEFAULT 0 NOT NULL,
    "apiKeyLimit" integer DEFAULT 100 NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO guzhenqiang;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: guzhenqiang
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."User_id_seq" OWNER TO guzhenqiang;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: guzhenqiang
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: guzhenqiang
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO guzhenqiang;

--
-- Name: Admin id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."Admin" ALTER COLUMN id SET DEFAULT nextval('public."Admin_id_seq"'::regclass);


--
-- Name: BlacklistedToken id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."BlacklistedToken" ALTER COLUMN id SET DEFAULT nextval('public."BlacklistedToken_id_seq"'::regclass);


--
-- Name: RefreshToken id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."RefreshToken" ALTER COLUMN id SET DEFAULT nextval('public."RefreshToken_id_seq"'::regclass);


--
-- Name: SystemConfig id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."SystemConfig" ALTER COLUMN id SET DEFAULT nextval('public."SystemConfig_id_seq"'::regclass);


--
-- Name: SystemPrompt id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."SystemPrompt" ALTER COLUMN id SET DEFAULT nextval('public."SystemPrompt_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."Admin" (id, email, username, password, "apiKey", role, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BlacklistedToken; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."BlacklistedToken" (id, token, "expiresAt", "createdAt") FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoidGVzdDk4NTgiLCJlbWFpbCI6InRlc3Q5ODU4QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ1NzM1MDIxLCJleHAiOjE3NDU3MzY4MjF9.m2itg7mx9gZwgsS-65WkXi7qkUE4VlGxRhU-FFEKdZY	2025-04-27 06:53:41	2025-04-27 06:23:41.088
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."ChatMessage" (id, "sessionId", role, content, tokens, "createdAt", "updatedAt") FROM stdin;
bd006421-5f5e-4a31-a988-efae6a374823	0a0c9007-204c-45d2-8f66-72c43f46e881	user	顾振强是谁	0	2025-04-25 08:21:05.411	2025-04-25 08:21:05.411
bbd4ce2b-0a13-4f18-9bcb-82994c94ebb4	0a0c9007-204c-45d2-8f66-72c43f46e881	assistant	顾振强是一位具有13年工作经验的专业人士，现居苏州。他拥有丰富的跨行业团队领导经验，精通项目规划与执行，并在BAT等大型企业和初创公司中展现了卓越的团队协调与发展策略。他目前在云学堂信息科技（江苏）有限公司担任技术经理，并且曾在斜杠科技和阿里巴巴等公司工作。顾振强拥有PMP项目管理认证，以及在多个技术和项目管理领域的专业技能。	0	2025-04-25 08:21:10.174	2025-04-25 08:21:10.174
1abbdddf-69fa-49b4-ada9-96b0f9e13b76	2edac436-552d-4f39-ad54-9653b74592aa	user	顾振强是谁	0	2025-04-25 10:07:01.473	2025-04-25 10:07:01.473
cd7930b1-2150-4c1e-9248-a62a6b8c7db7	2edac436-552d-4f39-ad54-9653b74592aa	assistant	根据知识库内容，顾振强是一位拥有13年工作经验的项目经理和移动开发技术专家。他拥有苏州籍贯，并具备丰富的跨行业团队领导能力和项目规划与执行能力。他曾在多个知名企业和初创公司中担任重要职位，具备出色的沟通与决策能力，同时拥有PMP项目管理认证。他的求职意向是项目经理或AI相关职位，期望在苏州工作。	0	2025-04-25 10:07:04.946	2025-04-25 10:07:04.946
1f8d11d6-1a7f-4286-ba74-8e12015d03b9	709e2666-a90b-4ee8-86a2-94c99e41ac9a	user	nihao	0	2025-04-26 07:37:35.276	2025-04-26 07:37:35.276
d3142a44-5d48-4c1d-a978-c511a8f8f952	709e2666-a90b-4ee8-86a2-94c99e41ac9a	assistant	你好，请问有什么我可以帮助你的？	0	2025-04-26 07:37:38	2025-04-26 07:37:38
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt", "updatedAt") FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NDU2NDAyMjksImV4cCI6MTc0NjI0NTAyOX0.LbNUZmtQQHwYi5VDm1LA6izIqhODJQzfcmwtV4wLImA	2	2025-05-03 04:03:49.855	2025-04-26 04:03:49.857	2025-04-26 04:03:49.857
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NDU3MzQ2NzksImV4cCI6MTc0NjMzOTQ3OX0.ploeEYb6uC9UxSYwTeFyhT-xDN1A39E7arEODdHooaI	9	2025-05-04 06:17:59.113	2025-04-27 06:17:59.114	2025-04-27 06:17:59.114
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzQ1NzM1MDIxLCJleHAiOjE3NDYzMzk4MjF9.fPmaEmaugXNDlXsgI_VnaBdwpMuJhsXxlw8LO05Rlcg	10	2025-05-04 06:23:41.043	2025-04-27 06:23:41.044	2025-04-27 06:23:41.044
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."Session" (id, title, description, "userId", "isActive", "createdAt", "updatedAt", "adminId") FROM stdin;
d6da6e4c-d5a8-4dce-9b37-62e6cc4bf6fb	关于人工智能的讨论	探讨AI的发展趋势和应用场景	2	t	2025-04-25 07:24:40.497	2025-04-25 07:24:40.497	\N
b7b475c4-de9c-4a12-aa65-d25555102b6b	编程问题解答	讨论JavaScript和React相关问题	2	t	2025-04-25 07:24:40.51	2025-04-25 07:24:40.51	\N
45b362c4-3eee-4f76-b4f3-1a8aaaa89cf8	新项目规划	讨论新Web应用的架构和技术选型	2	t	2025-04-25 07:24:40.513	2025-04-25 07:24:40.513	\N
c8173578-54ff-4fcd-91c0-523b2343890f	111		3	t	2025-04-25 08:06:17.994	2025-04-25 08:06:17.994	\N
8c0d40d1-3641-4730-84b2-00f64baabfdb	222		3	t	2025-04-25 08:06:30.554	2025-04-25 08:06:30.554	\N
432c0b87-9825-46a5-96e5-6fdbde24e7e3	333		3	t	2025-04-25 08:13:49.373	2025-04-25 08:13:49.373	\N
0a0c9007-204c-45d2-8f66-72c43f46e881	444		3	t	2025-04-25 08:19:52.66	2025-04-25 08:21:10.172	\N
2edac436-552d-4f39-ad54-9653b74592aa	123		3	t	2025-04-25 10:06:52.933	2025-04-25 10:07:04.943	\N
a809ecb3-ea87-42b8-867b-113bb2163411	1231		3	t	2025-04-26 07:37:26.665	2025-04-26 07:37:26.665	\N
709e2666-a90b-4ee8-86a2-94c99e41ac9a	123123123		3	t	2025-04-26 07:37:31.639	2025-04-26 07:37:37.998	\N
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."SystemConfig" (id, key, value, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemPrompt; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."SystemPrompt" (id, name, content, type, "isDefault", "createdAt", "updatedAt") FROM stdin;
1	123123	123123	system	f	2025-04-25 10:03:17.558	2025-04-25 10:03:17.558
2	234234	wedding	system	t	2025-04-25 10:03:40.723	2025-04-25 10:03:40.723
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public."User" (id, username, email, password, role, "apiKey", "apiKeyUsage", "apiKeyLimit", "lastLoginAt", "isActive", "createdAt", "updatedAt") FROM stdin;
3	user1	user1@example.com	$2b$10$hU3wfOexTx8z0fL6l9g3CefJHpb.R5Ow3jSyczHQdwHLzSg1bpj6.	user	\N	0	100	\N	t	2025-04-25 08:05:28.476	2025-04-25 08:05:28.476
4	user2	user2@example.com	$2b$10$ANNyessF4ZU58xrmzjFxfeyIZ5XDQwzpRSWf4EG1/kQcmfM7aadCe	user	\N	0	100	\N	t	2025-04-25 08:05:28.548	2025-04-25 08:05:28.548
5	admin	admin@example.com	$2b$10$nDW6VDrtTDWVG/96LKYrCulXkI15P8mFQSBN3pxZoM63bTA3zIo2S	admin	\N	0	100	\N	t	2025-04-25 08:05:28.612	2025-04-25 08:05:28.612
7	superadmin	superadmin@example.com	$2b$10$gudyPF74iDL2TBoSXRGNVO2JjU6TeNHEbEzVhTM/fV1o/qFQH/04G	admin	\N	0	100	\N	t	2025-04-25 09:23:54.515	2025-04-25 09:23:54.515
2	testuser	test@example.com	$2b$10$J3KEltzvJo8k7ftsUNSqFut0T.NHPA7ilKo7GFZYxzA4xdp0/Lnaq	user	\N	0	100	2025-04-26 04:03:49.867	t	2025-04-25 02:52:06.668	2025-04-26 04:03:49.868
8	testuser2	test2@example.com	$2b$10$3BtOxCGwF4DkI92k3nqgru/8skrGWnakaDH2Rc/wqFPZG4.ykAh8C	user	\N	0	100	2025-04-26 07:33:18.525	t	2025-04-26 07:32:17.922	2025-04-26 07:33:18.526
9	test4265	test4265@example.com	$2b$10$QV9tOJP9kkXD7r8detat7.51TkYjK9fosJCU6ao8URhEzvqvBplgq	user	\N	0	100	2025-04-27 06:17:59.102	t	2025-04-27 06:17:59.103	2025-04-27 06:17:59.103
10	test9858	test9858@example.com	$2b$10$1grCsBqAgV4xDCjHjLnss.Zp5ZjJD9aECkeTZJZ6u0SO7.BAgJTni	user	\N	0	100	2025-04-27 06:23:41.038	t	2025-04-27 06:23:41.039	2025-04-27 06:23:41.039
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: guzhenqiang
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
ef42eadd-49e1-4e44-9679-f69a252523d0	3d24cbeb7f401d81cc2a9e3364cc3e3932b53e1bcd940de86beb177d4264ba3d	2025-04-25 10:05:34.829602+08	20250425020534_create_users_table	\N	\N	2025-04-25 10:05:34.820784+08	1
5c3928e4-34f4-4a68-b442-9d153489b481	69e697870aa40f0b882db3c6b9a8553449dd4954af28ea58e76d82d40a42a8a9	2025-04-25 15:18:58.188676+08	20250425071857_add_session_models	\N	\N	2025-04-25 15:18:58.174639+08	1
43a917a3-92f2-4d10-b6b1-cf374feede58	edbf37c4120511028a065d5a84d47857172fc500515a8151a8c3630557c7f77a	2025-04-25 17:11:08.672578+08	20250425091108_add_admin_session_relation	\N	\N	2025-04-25 17:11:08.656117+08	1
7e2ff6e5-b550-4f3b-a01c-f383bf8c9a8e	e5521812a865d033fb685159edff42b23ba539e9254a2f92eb63c2f355b834ea	2025-04-26 11:01:27.713984+08	20250426030127_add_refresh_tokens	\N	\N	2025-04-26 11:01:27.699005+08	1
62f2d5da-658c-4c05-bb8b-e47c35bdc1a3	df7adb45777ff30ff2c2cc05dde65dd63711e4507ed5e4e4c3d0358c428d19b9	2025-04-27 14:20:56.333075+08	20250427062056_add_blacklisted_tokens	\N	\N	2025-04-27 14:20:56.323504+08	1
\.


--
-- Name: Admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."Admin_id_seq"', 1, false);


--
-- Name: BlacklistedToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."BlacklistedToken_id_seq"', 1, true);


--
-- Name: RefreshToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."RefreshToken_id_seq"', 3, true);


--
-- Name: SystemConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."SystemConfig_id_seq"', 1, false);


--
-- Name: SystemPrompt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."SystemPrompt_id_seq"', 2, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: guzhenqiang
--

SELECT pg_catalog.setval('public."User_id_seq"', 10, true);


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: BlacklistedToken BlacklistedToken_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."BlacklistedToken"
    ADD CONSTRAINT "BlacklistedToken_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfig SystemConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."SystemConfig"
    ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id);


--
-- Name: SystemPrompt SystemPrompt_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."SystemPrompt"
    ADD CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Admin_apiKey_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "Admin_apiKey_key" ON public."Admin" USING btree ("apiKey");


--
-- Name: Admin_email_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "Admin_email_key" ON public."Admin" USING btree (email);


--
-- Name: BlacklistedToken_token_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "BlacklistedToken_token_key" ON public."BlacklistedToken" USING btree (token);


--
-- Name: ChatMessage_sessionId_idx; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE INDEX "ChatMessage_sessionId_idx" ON public."ChatMessage" USING btree ("sessionId");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RefreshToken_userId_idx; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE INDEX "RefreshToken_userId_idx" ON public."RefreshToken" USING btree ("userId");


--
-- Name: Session_adminId_idx; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE INDEX "Session_adminId_idx" ON public."Session" USING btree ("adminId");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: SystemConfig_key_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "SystemConfig_key_key" ON public."SystemConfig" USING btree (key);


--
-- Name: SystemPrompt_name_type_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "SystemPrompt_name_type_key" ON public."SystemPrompt" USING btree (name, type);


--
-- Name: User_apiKey_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "User_apiKey_key" ON public."User" USING btree ("apiKey");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: guzhenqiang
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: ChatMessage ChatMessage_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public."Session"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."Admin"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: guzhenqiang
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

