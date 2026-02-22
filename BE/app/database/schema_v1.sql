create table history_price
(
    ticker       varchar(10) not null,
    trading_date text        not null,
    open         numeric(15, 2),
    high         numeric(15, 2),
    low          numeric(15, 2),
    close        numeric(15, 2),
    volume       bigint,
    import_time  timestamp default CURRENT_TIMESTAMP,
    primary key (ticker, trading_date)
);

alter table history_price
    owner to admin;

create table market_index
(
    ticker       varchar(10) not null,
    trading_date text        not null,
    open         numeric(15, 2),
    high         numeric(15, 2),
    low          numeric(15, 2),
    close        numeric(15, 2),
    volume       bigint,
    import_time  timestamp default CURRENT_TIMESTAMP,
    primary key (ticker, trading_date)
);

alter table market_index
    owner to admin;

create table owner
(
    ticker      varchar(10),
    name        varchar(255),
    position    varchar(255),
    percent     text,
    type        varchar(50),
    import_time timestamp default CURRENT_TIMESTAMP
);

alter table owner
    owner to admin;

create table company_overview
(
    ticker           varchar(10) not null,
    overview         text,
    icb_name1        text,
    icb_name2        text,
    icb_name3        text,
    import_time      timestamp default CURRENT_TIMESTAMP,
    exchange         text        not null,
    type_info        text,
    organ_short_name text,
    organ_name       text,
    product_group    text,
    primary key (ticker, exchange)
);

alter table company_overview
    owner to admin;

create table bctc
(
    ticker      varchar(10) not null,
    quarter     varchar(10) not null,
    year        integer     not null,
    ind_name    text,
    ind_code    text        not null,
    value       numeric(25, 4),
    import_time timestamp default CURRENT_TIMESTAMP,
    report_name varchar(255),
    report_code varchar(100),
    constraint pk_bctc
        primary key (ticker, year, quarter, ind_code)
);

alter table bctc
    owner to admin;

create table realtime_quotes
(
    symbol           varchar(20) not null,
    ts               timestamp   not null,
    last_price       numeric(18, 4),
    avg_price        numeric(18, 4),
    last_volume      bigint,
    total_volume     bigint,
    total_value      numeric(20, 2),
    foreign_buy_qty  bigint,
    foreign_sell_qty bigint,
    foreign_buy_val  numeric(20, 2),
    foreign_sell_val numeric(20, 2),
    bid1_price       numeric(18, 4),
    bid1_qty         bigint,
    bid2_price       numeric(18, 4),
    bid2_qty         bigint,
    bid3_price       numeric(18, 4),
    bid3_qty         bigint,
    ask1_price       numeric(18, 4),
    ask1_qty         bigint,
    ask2_price       numeric(18, 4),
    ask2_qty         bigint,
    ask3_price       numeric(18, 4),
    ask3_qty         bigint,
    ref_price        numeric(18, 4),
    ceil_price       numeric(18, 4),
    floor_price      numeric(18, 4),
    change_percent   numeric(10, 4),
    change_value     numeric(18, 4),
    high_price       numeric(18, 4),
    low_price        numeric(18, 4),
    constraint pk_realtime_quotes
        primary key (symbol, ts)
);

alter table realtime_quotes
    owner to admin;

create index idx_realtime_quotes_symbol
    on realtime_quotes (symbol);

create index idx_realtime_quotes_ts
    on realtime_quotes (ts desc);

create index idx_realtime_quotes_symbol_ts
    on realtime_quotes (symbol asc, ts desc);

create table macro_economy
(
    date       date        not null,
    open       real,
    high       real,
    low        real,
    close      real,
    volume     bigint,
    asset_type varchar(20) not null,
    primary key (asset_type, date)
);

alter table macro_economy
    owner to admin;

create table financial_ratio
(
    id                             bigserial,
    ind_code                       text,
    ticker                         varchar(20) not null,
    year                           integer     not null,
    quarter                        integer     not null,
    fixed_asset_to_equity          double precision,
    equity_to_charter_capital      double precision,
    ebit_margin                    double precision,
    gross_margin                   double precision,
    net_margin                     double precision,
    ebit_value                     double precision,
    financial_leverage             double precision,
    period_type                    varchar(10),
    extracted_at                   text,
    long_short_term_debt_on_equity double precision,
    debt_to_equity                 double precision,
    asset_turnover                 double precision,
    fixed_asset_turnover           double precision,
    receivable_days                double precision,
    inventory_days                 double precision,
    payable_days                   double precision,
    cash_conversion_cycle          double precision,
    inventory_turnover             double precision,
    roe                            double precision,
    roic                           double precision,
    roa                            double precision,
    ebitda_value                   double precision,
    current_ratio                  double precision,
    cash_ratio                     double precision,
    quick_ratio                    double precision,
    interest_coverage_ratio        double precision,
    market_cap                     double precision,
    outstanding_shares             double precision,
    pe                             double precision,
    pb                             double precision,
    ps                             double precision,
    p_cashflow                     double precision,
    eps                            double precision,
    bvps                           double precision,
    ev_ebitda                      double precision,
    dividend_yield                 double precision,
    primary key (id, ticker, year, quarter)
);

alter table financial_ratio
    owner to admin;

create table electric_board
(
    id                  serial,
    ticker              varchar(20) not null,
    exchange            varchar(10) not null,
    trading_date        date        not null,
    ref_price           numeric(18, 2),
    match_price         numeric(18, 2),
    accumulated_volume  bigint,
    highest_price       numeric(18, 2),
    lowest_price        numeric(18, 2),
    foreign_buy_volume  bigint,
    foreign_sell_volume bigint,
    bid_1_price         numeric(18, 2),
    bid_1_volume        bigint,
    bid_2_price         numeric(18, 2),
    bid_2_volume        bigint,
    bid_3_price         numeric(18, 2),
    bid_3_volume        bigint,
    ask_1_price         numeric(18, 2),
    ask_1_volume        bigint,
    ask_2_price         numeric(18, 2),
    ask_2_volume        bigint,
    ask_3_price         numeric(18, 2),
    ask_3_volume        bigint,
    created_at          timestamp default CURRENT_TIMESTAMP,
    primary key (id, ticker, exchange, trading_date)
);

alter table electric_board
    owner to admin;

create unique index idx_electric_board_ticker_date
    on electric_board (ticker, trading_date);

create table event
(
    event_title     text,
    public_date     text,
    source_url      text,
    event_list_name text,
    event_list_code text,
    id              text
);

alter table event
    owner to admin;

create table vn_macro_yearly
(
    year                               integer not null
        primary key,
    tang_truong_gdp                    double precision,
    lam_phat                           double precision,
    tang_truong_cong_nghiep_xay_dung   double precision,
    tang_truong_nganh_che_bien_che_tao double precision,
    tang_truong_tieu_dung_ho_gia_inh   double precision,
    ty_gia_usd_vnd                     double precision,
    lai_suat_tien_gui                  double precision,
    lai_suat_cho_vay                   double precision,
    tang_truong_xuat_khau              double precision,
    tang_truong_nhap_khau              double precision,
    can_can_thuong_mai                 double precision,
    fdi_thuc_hien                      double precision,
    du_tru_ngoai_hoi                   double precision,
    tang_truong_cung_tien_m2           double precision,
    no_xau_ngan_hang                   double precision
);

alter table vn_macro_yearly
    owner to admin;

create table news
(
    id          serial
        constraint new_v1_pkey
            primary key,
    source      text,
    title       text,
    link        text
        constraint new_v1_link_key
            unique,
    published   timestamp,
    summary     text,
    inserted_at timestamp default now()
);

alter table news
    owner to admin;

