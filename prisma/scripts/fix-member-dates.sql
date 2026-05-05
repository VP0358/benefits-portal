-- ================================================================
-- MLM会員 日付一括修正SQL (JST 00:00:00 で正確に保存)
-- 対象フィールド: birth_date, contract_date, first_pay_date
-- 生成元: 2026-5-5-14-8-23member_mst.csv
-- ================================================================

BEGIN;

-- memberCode をキーにして日付を一括更新
-- JST 00:00:00+09 として保存することでタイムゾーンずれを防ぐ

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2025-04-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '999-01';

UPDATE "MlmMember" SET
    birth_date = '1962-06-12 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '102340-01';

UPDATE "MlmMember" SET
    birth_date = '1955-03-02 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '104865-01';

UPDATE "MlmMember" SET
    birth_date = '1947-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '104922-01';

UPDATE "MlmMember" SET
    birth_date = '1969-08-16 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '105800-01';

UPDATE "MlmMember" SET
    birth_date = '1993-05-13 00:00:00+09'::timestamptz,
    contract_date = '2025-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '106375-01';

UPDATE "MlmMember" SET
    birth_date = '1965-04-26 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '107499-01';

UPDATE "MlmMember" SET
    birth_date = '1960-11-22 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '108858-01';

UPDATE "MlmMember" SET
    birth_date = '1960-11-22 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '108858-02';

UPDATE "MlmMember" SET
    birth_date = '1960-11-22 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '108858-03';

UPDATE "MlmMember" SET
    birth_date = '1961-12-06 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '109004-01';

UPDATE "MlmMember" SET
    birth_date = '1970-05-28 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-19 00:00:00+09'::timestamptz
  WHERE member_code = '109055-01';

UPDATE "MlmMember" SET
    birth_date = '1948-07-03 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '110034-01';

UPDATE "MlmMember" SET
    birth_date = '1954-02-04 00:00:00+09'::timestamptz,
    contract_date = '2025-08-01 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-31 00:00:00+09'::timestamptz
  WHERE member_code = '110052-01';

UPDATE "MlmMember" SET
    birth_date = '1951-11-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '113043-01';

UPDATE "MlmMember" SET
    birth_date = '1972-11-12 00:00:00+09'::timestamptz,
    contract_date = '2026-04-07 00:00:00+09'::timestamptz,
    first_pay_date = '2026-04-07 00:00:00+09'::timestamptz
  WHERE member_code = '114942-01';

UPDATE "MlmMember" SET
    birth_date = '1949-10-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '115834-01';

UPDATE "MlmMember" SET
    birth_date = '1993-04-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '116436-01';

UPDATE "MlmMember" SET
    birth_date = '1962-03-11 00:00:00+09'::timestamptz,
    contract_date = '2026-05-02 00:00:00+09'::timestamptz,
    first_pay_date = '2026-05-02 00:00:00+09'::timestamptz
  WHERE member_code = '117035-01';

UPDATE "MlmMember" SET
    birth_date = '1941-07-11 00:00:00+09'::timestamptz,
    contract_date = '2024-12-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '118181-01';

UPDATE "MlmMember" SET
    birth_date = '1953-02-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '119344-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '120912-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '120912-02';

UPDATE "MlmMember" SET
    birth_date = '1979-02-07 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '122266-01';

UPDATE "MlmMember" SET
    birth_date = '1962-05-24 00:00:00+09'::timestamptz,
    contract_date = '2024-10-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '122341-01';

UPDATE "MlmMember" SET
    birth_date = '1953-05-11 00:00:00+09'::timestamptz,
    contract_date = '2025-07-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '123760-01';

UPDATE "MlmMember" SET
    birth_date = '1950-02-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '124092-01';

UPDATE "MlmMember" SET
    birth_date = '1950-02-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '124092-02';

UPDATE "MlmMember" SET
    birth_date = '1950-02-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '124092-03';

UPDATE "MlmMember" SET
    birth_date = '1951-03-16 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '125643-01';

UPDATE "MlmMember" SET
    birth_date = '1951-01-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '126546-01';

UPDATE "MlmMember" SET
    birth_date = '1951-01-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '126546-02';

UPDATE "MlmMember" SET
    birth_date = '1958-05-22 00:00:00+09'::timestamptz,
    contract_date = '2025-03-18 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-18 00:00:00+09'::timestamptz
  WHERE member_code = '128776-01';

UPDATE "MlmMember" SET
    birth_date = '1972-06-22 00:00:00+09'::timestamptz,
    contract_date = '2025-10-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '131921-01';

UPDATE "MlmMember" SET
    birth_date = '2003-06-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '132292-01';

UPDATE "MlmMember" SET
    birth_date = '2003-06-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '132292-02';

UPDATE "MlmMember" SET
    birth_date = '2003-06-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '132292-03';

UPDATE "MlmMember" SET
    birth_date = '2003-06-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '132292-04';

UPDATE "MlmMember" SET
    birth_date = '1952-03-03 00:00:00+09'::timestamptz,
    contract_date = '2025-01-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '133418-01';

UPDATE "MlmMember" SET
    birth_date = '1943-11-03 00:00:00+09'::timestamptz,
    contract_date = '2025-01-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '133795-01';

UPDATE "MlmMember" SET
    birth_date = '1955-01-08 00:00:00+09'::timestamptz,
    contract_date = '2024-12-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '134514-01';

UPDATE "MlmMember" SET
    birth_date = '1950-04-08 00:00:00+09'::timestamptz,
    contract_date = '2026-01-30 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-30 00:00:00+09'::timestamptz
  WHERE member_code = '137061-01';

UPDATE "MlmMember" SET
    birth_date = '1952-06-03 00:00:00+09'::timestamptz,
    contract_date = '2024-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '139413-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '139413-02';

UPDATE "MlmMember" SET
    birth_date = '1989-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '140471-01';

UPDATE "MlmMember" SET
    birth_date = '1973-05-30 00:00:00+09'::timestamptz,
    contract_date = '2025-04-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '140767-01';

UPDATE "MlmMember" SET
    birth_date = '1958-04-05 00:00:00+09'::timestamptz,
    contract_date = '2025-06-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-22 00:00:00+09'::timestamptz
  WHERE member_code = '141421-01';

UPDATE "MlmMember" SET
    birth_date = '1961-05-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '142472-01';

UPDATE "MlmMember" SET
    birth_date = '1949-11-01 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '142600-01';

UPDATE "MlmMember" SET
    birth_date = '1949-11-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '142600-02';

UPDATE "MlmMember" SET
    birth_date = '1952-05-12 00:00:00+09'::timestamptz,
    contract_date = '2026-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '143726-01';

UPDATE "MlmMember" SET
    birth_date = '1985-10-11 00:00:00+09'::timestamptz,
    contract_date = '2024-12-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '144205-01';

UPDATE "MlmMember" SET
    birth_date = '1957-08-03 00:00:00+09'::timestamptz,
    contract_date = '2024-12-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '144542-01';

UPDATE "MlmMember" SET
    birth_date = '1959-11-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '145781-01';

UPDATE "MlmMember" SET
    birth_date = '1951-03-12 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '146768-01';

UPDATE "MlmMember" SET
    birth_date = '1953-07-05 00:00:00+09'::timestamptz,
    contract_date = '2025-07-29 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-29 00:00:00+09'::timestamptz
  WHERE member_code = '147337-01';

UPDATE "MlmMember" SET
    birth_date = '1935-04-30 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '148400-01';

UPDATE "MlmMember" SET
    birth_date = '1986-06-24 00:00:00+09'::timestamptz,
    contract_date = '2024-10-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '148576-01';

UPDATE "MlmMember" SET
    birth_date = '1986-06-24 00:00:00+09'::timestamptz,
    contract_date = '2025-01-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '148576-02';

UPDATE "MlmMember" SET
    birth_date = '1962-01-29 00:00:00+09'::timestamptz,
    contract_date = '2025-03-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '149873-01';

UPDATE "MlmMember" SET
    birth_date = '1972-03-24 00:00:00+09'::timestamptz,
    contract_date = '2025-01-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '151047-01';

UPDATE "MlmMember" SET
    birth_date = '1962-06-12 00:00:00+09'::timestamptz,
    contract_date = '2024-11-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '151424-01';

UPDATE "MlmMember" SET
    birth_date = '1959-10-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '152263-01';

UPDATE "MlmMember" SET
    birth_date = '1959-10-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '152263-02';

UPDATE "MlmMember" SET
    birth_date = '1959-10-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '152263-03';

UPDATE "MlmMember" SET
    birth_date = '1988-08-12 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '153165-01';

UPDATE "MlmMember" SET
    birth_date = '1971-04-05 00:00:00+09'::timestamptz,
    contract_date = '2025-09-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '153823-01';

UPDATE "MlmMember" SET
    birth_date = '1949-07-19 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '154816-01';

UPDATE "MlmMember" SET
    birth_date = '1949-07-19 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '154816-02';

UPDATE "MlmMember" SET
    birth_date = '1949-07-19 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '154816-03';

UPDATE "MlmMember" SET
    birth_date = '1954-10-14 00:00:00+09'::timestamptz,
    contract_date = '2024-11-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '156471-01';

UPDATE "MlmMember" SET
    birth_date = '1960-05-05 00:00:00+09'::timestamptz,
    contract_date = '2025-01-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '156711-01';

UPDATE "MlmMember" SET
    birth_date = '1961-02-24 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '157813-01';

UPDATE "MlmMember" SET
    birth_date = '1975-07-30 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '159783-01';

UPDATE "MlmMember" SET
    birth_date = '1975-07-30 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '159783-02';

UPDATE "MlmMember" SET
    birth_date = '1975-07-30 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '159783-03';

UPDATE "MlmMember" SET
    birth_date = '1937-01-21 00:00:00+09'::timestamptz,
    contract_date = '2025-01-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '159874-01';

UPDATE "MlmMember" SET
    birth_date = '1965-06-21 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-01-11 00:00:00+09'::timestamptz
  WHERE member_code = '160417-01';

UPDATE "MlmMember" SET
    birth_date = '1980-10-12 00:00:00+09'::timestamptz,
    contract_date = '2024-10-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '160833-01';

UPDATE "MlmMember" SET
    birth_date = '1969-05-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '163200-01';

UPDATE "MlmMember" SET
    birth_date = '1967-03-13 00:00:00+09'::timestamptz,
    contract_date = '2024-09-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '163915-01';

UPDATE "MlmMember" SET
    birth_date = '1967-03-13 00:00:00+09'::timestamptz,
    contract_date = '2024-09-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '163915-02';

UPDATE "MlmMember" SET
    birth_date = '1967-03-13 00:00:00+09'::timestamptz,
    contract_date = '2024-09-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '163915-03';

UPDATE "MlmMember" SET
    birth_date = '1959-09-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '165217-01';

UPDATE "MlmMember" SET
    birth_date = '1959-09-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '165217-02';

UPDATE "MlmMember" SET
    birth_date = '1965-09-16 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '166814-01';

UPDATE "MlmMember" SET
    birth_date = '1965-06-23 00:00:00+09'::timestamptz,
    contract_date = '2025-06-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '167683-01';

UPDATE "MlmMember" SET
    birth_date = '1982-12-26 00:00:00+09'::timestamptz,
    contract_date = '2024-12-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '171053-01';

UPDATE "MlmMember" SET
    birth_date = '1981-08-12 00:00:00+09'::timestamptz,
    contract_date = '2025-01-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '171172-01';

UPDATE "MlmMember" SET
    birth_date = '1952-08-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '171503-01';

UPDATE "MlmMember" SET
    birth_date = '1952-08-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '171503-02';

UPDATE "MlmMember" SET
    birth_date = '1962-02-16 00:00:00+09'::timestamptz,
    contract_date = '2026-02-09 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-09 00:00:00+09'::timestamptz
  WHERE member_code = '173846-01';

UPDATE "MlmMember" SET
    birth_date = '1974-09-30 00:00:00+09'::timestamptz,
    contract_date = '2025-03-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '174480-01';

UPDATE "MlmMember" SET
    birth_date = '1989-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '177910-01';

UPDATE "MlmMember" SET
    birth_date = '1971-06-19 00:00:00+09'::timestamptz,
    contract_date = '2025-05-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '179821-01';

UPDATE "MlmMember" SET
    birth_date = '1970-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '182398-01';

UPDATE "MlmMember" SET
    birth_date = '1970-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '182398-02';

UPDATE "MlmMember" SET
    birth_date = '1970-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '182398-03';

UPDATE "MlmMember" SET
    birth_date = '1956-02-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '182934-01';

UPDATE "MlmMember" SET
    birth_date = '1972-06-05 00:00:00+09'::timestamptz,
    contract_date = '2024-11-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '184402-01';

UPDATE "MlmMember" SET
    birth_date = '1971-07-23 00:00:00+09'::timestamptz,
    contract_date = '2025-01-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '184751-01';

UPDATE "MlmMember" SET
    birth_date = '1960-07-02 00:00:00+09'::timestamptz,
    contract_date = '2025-04-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-04-25 00:00:00+09'::timestamptz
  WHERE member_code = '184935-01';

UPDATE "MlmMember" SET
    birth_date = '1950-05-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '186255-01';

UPDATE "MlmMember" SET
    birth_date = '1977-09-06 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '187457-01';

UPDATE "MlmMember" SET
    birth_date = '1977-09-06 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '187457-02';

UPDATE "MlmMember" SET
    birth_date = '1940-06-29 00:00:00+09'::timestamptz,
    contract_date = '2025-07-23 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-23 00:00:00+09'::timestamptz
  WHERE member_code = '189075-01';

UPDATE "MlmMember" SET
    birth_date = '1948-10-31 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '189518-01';

UPDATE "MlmMember" SET
    birth_date = '1952-03-30 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '190610-01';

UPDATE "MlmMember" SET
    birth_date = '1964-11-21 00:00:00+09'::timestamptz,
    contract_date = '2025-01-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '193042-01';

UPDATE "MlmMember" SET
    birth_date = '1960-02-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-16 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-16 00:00:00+09'::timestamptz
  WHERE member_code = '193972-01';

UPDATE "MlmMember" SET
    birth_date = '1946-02-07 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '194374-01';

UPDATE "MlmMember" SET
    birth_date = '1946-02-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '194374-02';

UPDATE "MlmMember" SET
    birth_date = '1960-04-08 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '194760-01';

UPDATE "MlmMember" SET
    birth_date = '1963-02-13 00:00:00+09'::timestamptz,
    contract_date = '2025-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '195783-01';

UPDATE "MlmMember" SET
    birth_date = '1948-12-13 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '196664-01';

UPDATE "MlmMember" SET
    birth_date = '1948-12-13 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '196664-02';

UPDATE "MlmMember" SET
    birth_date = '1965-07-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '197379-01';

UPDATE "MlmMember" SET
    birth_date = '1950-08-25 00:00:00+09'::timestamptz,
    contract_date = '2024-10-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '198374-01';

UPDATE "MlmMember" SET
    birth_date = '1962-06-03 00:00:00+09'::timestamptz,
    contract_date = '2025-10-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '199204-01';

UPDATE "MlmMember" SET
    birth_date = '1962-01-02 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '199330-01';

UPDATE "MlmMember" SET
    birth_date = '1953-03-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '199506-01';

UPDATE "MlmMember" SET
    birth_date = '1953-04-05 00:00:00+09'::timestamptz,
    contract_date = '2024-11-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '200453-01';

UPDATE "MlmMember" SET
    birth_date = '1962-10-12 00:00:00+09'::timestamptz,
    contract_date = '2025-03-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '203126-01';

UPDATE "MlmMember" SET
    birth_date = '1990-01-20 00:00:00+09'::timestamptz,
    contract_date = '2025-08-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-08-24 00:00:00+09'::timestamptz
  WHERE member_code = '203214-01';

UPDATE "MlmMember" SET
    birth_date = '1966-11-07 00:00:00+09'::timestamptz,
    contract_date = '2025-10-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-10-26 00:00:00+09'::timestamptz
  WHERE member_code = '204198-01';

UPDATE "MlmMember" SET
    birth_date = '1972-09-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '205087-01';

UPDATE "MlmMember" SET
    birth_date = '1972-09-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '205087-02';

UPDATE "MlmMember" SET
    birth_date = '1972-09-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '205087-03';

UPDATE "MlmMember" SET
    birth_date = '1964-05-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '209365-01';

UPDATE "MlmMember" SET
    birth_date = '1939-07-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '210833-01';

UPDATE "MlmMember" SET
    birth_date = '1955-07-02 00:00:00+09'::timestamptz,
    contract_date = '2026-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '211776-01';

UPDATE "MlmMember" SET
    birth_date = '1968-11-21 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '213540-01';

UPDATE "MlmMember" SET
    birth_date = '1976-03-26 00:00:00+09'::timestamptz,
    contract_date = '2025-06-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '214023-01';

UPDATE "MlmMember" SET
    birth_date = '1975-01-04 00:00:00+09'::timestamptz,
    contract_date = '2025-07-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '214763-01';

UPDATE "MlmMember" SET
    birth_date = '1944-05-27 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '214970-01';

UPDATE "MlmMember" SET
    birth_date = '1952-09-02 00:00:00+09'::timestamptz,
    contract_date = '2024-11-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '215327-01';

UPDATE "MlmMember" SET
    birth_date = '1952-09-02 00:00:00+09'::timestamptz,
    contract_date = '2024-11-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '215327-02';

UPDATE "MlmMember" SET
    birth_date = '1952-09-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '215327-03';

UPDATE "MlmMember" SET
    birth_date = '1952-09-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '215327-04';

UPDATE "MlmMember" SET
    birth_date = '1964-08-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '215419-01';

UPDATE "MlmMember" SET
    birth_date = '1964-07-20 00:00:00+09'::timestamptz,
    contract_date = '2026-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '218136-01';

UPDATE "MlmMember" SET
    birth_date = '1998-01-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '219531-01';

UPDATE "MlmMember" SET
    birth_date = '1959-10-22 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '219843-01';

UPDATE "MlmMember" SET
    birth_date = '1989-07-31 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '220658-01';

UPDATE "MlmMember" SET
    birth_date = '1962-04-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '224823-01';

UPDATE "MlmMember" SET
    birth_date = '1962-04-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '224823-02';

UPDATE "MlmMember" SET
    birth_date = '1962-04-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '224823-03';

UPDATE "MlmMember" SET
    birth_date = '1962-04-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '224823-04';

UPDATE "MlmMember" SET
    birth_date = '1950-04-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '226821-01';

UPDATE "MlmMember" SET
    birth_date = '1967-06-12 00:00:00+09'::timestamptz,
    contract_date = '2025-07-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '227231-01';

UPDATE "MlmMember" SET
    birth_date = '1989-05-24 00:00:00+09'::timestamptz,
    contract_date = '2024-12-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '228851-01';

UPDATE "MlmMember" SET
    birth_date = '1972-05-08 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '229382-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-07 00:00:00+09'::timestamptz,
    contract_date = '2025-04-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '231587-01';

UPDATE "MlmMember" SET
    birth_date = '1950-01-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-15 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '233561-01';

UPDATE "MlmMember" SET
    birth_date = '1940-12-21 00:00:00+09'::timestamptz,
    contract_date = '2025-02-21 00:00:00+09'::timestamptz,
    first_pay_date = '2025-01-11 00:00:00+09'::timestamptz
  WHERE member_code = '238706-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-25 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-25 00:00:00+09'::timestamptz
  WHERE member_code = '238954-01';

UPDATE "MlmMember" SET
    birth_date = '1955-03-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '241630-01';

UPDATE "MlmMember" SET
    birth_date = '1967-12-08 00:00:00+09'::timestamptz,
    contract_date = '2024-11-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '242301-01';

UPDATE "MlmMember" SET
    birth_date = '1967-12-08 00:00:00+09'::timestamptz,
    contract_date = '2024-11-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '242301-02';

UPDATE "MlmMember" SET
    birth_date = '1964-10-09 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '242373-01';

UPDATE "MlmMember" SET
    birth_date = '1947-06-28 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '246880-01';

UPDATE "MlmMember" SET
    birth_date = '1986-08-04 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '248793-01';

UPDATE "MlmMember" SET
    birth_date = '1951-04-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '249790-01';

UPDATE "MlmMember" SET
    birth_date = '1968-06-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '250678-01';

UPDATE "MlmMember" SET
    birth_date = '1968-06-05 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '250678-02';

UPDATE "MlmMember" SET
    birth_date = '1976-03-31 00:00:00+09'::timestamptz,
    contract_date = '2024-12-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '251415-01';

UPDATE "MlmMember" SET
    birth_date = '1948-03-25 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '252900-01';

UPDATE "MlmMember" SET
    birth_date = '1948-03-25 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '252900-02';

UPDATE "MlmMember" SET
    birth_date = '1961-09-18 00:00:00+09'::timestamptz,
    contract_date = '2024-10-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '254055-01';

UPDATE "MlmMember" SET
    birth_date = '1961-09-18 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '254055-02';

UPDATE "MlmMember" SET
    birth_date = '1992-03-12 00:00:00+09'::timestamptz,
    contract_date = '2025-01-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '254081-01';

UPDATE "MlmMember" SET
    birth_date = '1946-10-02 00:00:00+09'::timestamptz,
    contract_date = '2025-03-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '255384-01';

UPDATE "MlmMember" SET
    birth_date = '1981-02-14 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '257654-01';

UPDATE "MlmMember" SET
    birth_date = '1953-09-14 00:00:00+09'::timestamptz,
    contract_date = '2025-07-25 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-25 00:00:00+09'::timestamptz
  WHERE member_code = '258084-01';

UPDATE "MlmMember" SET
    birth_date = '1959-09-20 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '260839-01';

UPDATE "MlmMember" SET
    birth_date = '1963-09-01 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '261094-01';

UPDATE "MlmMember" SET
    birth_date = '1982-11-14 00:00:00+09'::timestamptz,
    contract_date = '2025-11-21 00:00:00+09'::timestamptz,
    first_pay_date = '2025-11-21 00:00:00+09'::timestamptz
  WHERE member_code = '265222-01';

UPDATE "MlmMember" SET
    birth_date = '1959-04-14 00:00:00+09'::timestamptz,
    contract_date = '2026-03-20 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-20 00:00:00+09'::timestamptz
  WHERE member_code = '265702-01';

UPDATE "MlmMember" SET
    birth_date = '1966-02-15 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '265820-01';

UPDATE "MlmMember" SET
    birth_date = '1967-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '266210-01';

UPDATE "MlmMember" SET
    birth_date = '1967-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '266210-02';

UPDATE "MlmMember" SET
    birth_date = '1967-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '266210-03';

UPDATE "MlmMember" SET
    birth_date = '1967-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '266210-04';

UPDATE "MlmMember" SET
    birth_date = '1967-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '266210-05';

UPDATE "MlmMember" SET
    birth_date = '1996-08-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '269246-01';

UPDATE "MlmMember" SET
    birth_date = '1990-03-26 00:00:00+09'::timestamptz,
    contract_date = '2026-02-12 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-12 00:00:00+09'::timestamptz
  WHERE member_code = '270675-01';

UPDATE "MlmMember" SET
    birth_date = '1940-10-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '271309-01';

UPDATE "MlmMember" SET
    birth_date = '1967-05-14 00:00:00+09'::timestamptz,
    contract_date = '2024-11-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '272571-01';

UPDATE "MlmMember" SET
    birth_date = '1958-10-25 00:00:00+09'::timestamptz,
    contract_date = '2024-10-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '274147-01';

UPDATE "MlmMember" SET
    birth_date = '1958-10-25 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '274147-02';

UPDATE "MlmMember" SET
    birth_date = '1960-09-05 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '274228-01';

UPDATE "MlmMember" SET
    birth_date = '1969-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '274274-01';

UPDATE "MlmMember" SET
    birth_date = '1969-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '274274-02';

UPDATE "MlmMember" SET
    birth_date = '1969-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '274274-03';

UPDATE "MlmMember" SET
    birth_date = '1964-01-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '275240-01';

UPDATE "MlmMember" SET
    birth_date = '1952-04-06 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-31 00:00:00+09'::timestamptz
  WHERE member_code = '275950-01';

UPDATE "MlmMember" SET
    birth_date = '1987-06-17 00:00:00+09'::timestamptz,
    contract_date = '2024-11-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '278132-01';

UPDATE "MlmMember" SET
    birth_date = '1966-05-14 00:00:00+09'::timestamptz,
    contract_date = '2025-06-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '278455-01';

UPDATE "MlmMember" SET
    birth_date = '1957-07-24 00:00:00+09'::timestamptz,
    contract_date = '2024-12-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '279367-01';

UPDATE "MlmMember" SET
    birth_date = '1976-05-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-20 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '280668-01';

UPDATE "MlmMember" SET
    birth_date = '1968-12-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '281163-01';

UPDATE "MlmMember" SET
    birth_date = '1971-09-06 00:00:00+09'::timestamptz,
    contract_date = '2025-01-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '281297-01';

UPDATE "MlmMember" SET
    birth_date = '1942-03-31 00:00:00+09'::timestamptz,
    contract_date = '2025-05-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-23 00:00:00+09'::timestamptz
  WHERE member_code = '281944-01';

UPDATE "MlmMember" SET
    birth_date = '1963-08-25 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '282939-01';

UPDATE "MlmMember" SET
    birth_date = '1944-03-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '284264-01';

UPDATE "MlmMember" SET
    birth_date = '1982-03-18 00:00:00+09'::timestamptz,
    contract_date = '2025-02-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '286615-01';

UPDATE "MlmMember" SET
    birth_date = '1950-10-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-18 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '287782-01';

UPDATE "MlmMember" SET
    birth_date = '1959-03-07 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '288022-01';

UPDATE "MlmMember" SET
    birth_date = '1959-03-07 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '288022-02';

UPDATE "MlmMember" SET
    birth_date = '1959-03-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '288022-03';

UPDATE "MlmMember" SET
    birth_date = '1959-03-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '288022-04';

UPDATE "MlmMember" SET
    birth_date = '1959-03-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '288022-05';

UPDATE "MlmMember" SET
    birth_date = '1955-02-25 00:00:00+09'::timestamptz,
    contract_date = '2026-03-06 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-06 00:00:00+09'::timestamptz
  WHERE member_code = '288606-01';

UPDATE "MlmMember" SET
    birth_date = '1976-06-07 00:00:00+09'::timestamptz,
    contract_date = '2026-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '288646-01';

UPDATE "MlmMember" SET
    birth_date = '1945-08-11 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '289578-01';

UPDATE "MlmMember" SET
    birth_date = '1983-09-21 00:00:00+09'::timestamptz,
    contract_date = '2025-02-15 00:00:00+09'::timestamptz,
    first_pay_date = '2025-01-30 00:00:00+09'::timestamptz
  WHERE member_code = '292087-01';

UPDATE "MlmMember" SET
    birth_date = '1970-12-22 00:00:00+09'::timestamptz,
    contract_date = '2025-09-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '295507-01';

UPDATE "MlmMember" SET
    birth_date = '1955-05-07 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '299606-01';

UPDATE "MlmMember" SET
    birth_date = '1936-05-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '301444-01';

UPDATE "MlmMember" SET
    birth_date = '1936-05-29 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '301444-02';

UPDATE "MlmMember" SET
    birth_date = '1936-05-29 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '301444-03';

UPDATE "MlmMember" SET
    birth_date = '1989-09-28 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '302646-01';

UPDATE "MlmMember" SET
    birth_date = '1974-03-04 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '304537-01';

UPDATE "MlmMember" SET
    birth_date = '1974-03-04 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '304537-02';

UPDATE "MlmMember" SET
    birth_date = '1967-07-03 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '307784-01';

UPDATE "MlmMember" SET
    birth_date = '1946-04-03 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '308417-01';

UPDATE "MlmMember" SET
    birth_date = '1956-07-04 00:00:00+09'::timestamptz,
    contract_date = '2024-10-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '308734-01';

UPDATE "MlmMember" SET
    birth_date = '1956-07-04 00:00:00+09'::timestamptz,
    contract_date = '2024-10-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '308734-02';

UPDATE "MlmMember" SET
    birth_date = '1956-07-04 00:00:00+09'::timestamptz,
    contract_date = '2024-10-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '308734-03';

UPDATE "MlmMember" SET
    birth_date = '1962-08-17 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-31 00:00:00+09'::timestamptz
  WHERE member_code = '309699-01';

UPDATE "MlmMember" SET
    birth_date = '1967-05-16 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '311232-01';

UPDATE "MlmMember" SET
    birth_date = '1989-09-25 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '311376-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-28 00:00:00+09'::timestamptz,
    contract_date = '2024-10-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '314623-01';

UPDATE "MlmMember" SET
    birth_date = '1969-10-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '314908-01';

UPDATE "MlmMember" SET
    birth_date = '1944-01-12 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '317892-01';

UPDATE "MlmMember" SET
    birth_date = '1964-02-09 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '318134-01';

UPDATE "MlmMember" SET
    birth_date = '1941-12-05 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '318292-01';

UPDATE "MlmMember" SET
    birth_date = '1962-03-21 00:00:00+09'::timestamptz,
    contract_date = '2025-04-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '319477-01';

UPDATE "MlmMember" SET
    birth_date = '1948-03-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '321895-01';

UPDATE "MlmMember" SET
    birth_date = '1973-09-17 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '322207-01';

UPDATE "MlmMember" SET
    birth_date = '1986-08-13 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '325245-01';

UPDATE "MlmMember" SET
    birth_date = '1958-04-25 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '326471-01';

UPDATE "MlmMember" SET
    birth_date = '1953-05-09 00:00:00+09'::timestamptz,
    contract_date = '2024-11-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '326597-01';

UPDATE "MlmMember" SET
    birth_date = '1961-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '329618-01';

UPDATE "MlmMember" SET
    birth_date = '1958-07-25 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '329888-01';

UPDATE "MlmMember" SET
    birth_date = '1968-03-30 00:00:00+09'::timestamptz,
    contract_date = '2024-11-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '332815-01';

UPDATE "MlmMember" SET
    birth_date = '1973-12-25 00:00:00+09'::timestamptz,
    contract_date = '2025-03-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-27 00:00:00+09'::timestamptz
  WHERE member_code = '335615-01';

UPDATE "MlmMember" SET
    birth_date = '1964-12-22 00:00:00+09'::timestamptz,
    contract_date = '2026-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '339129-01';

UPDATE "MlmMember" SET
    birth_date = '1990-08-09 00:00:00+09'::timestamptz,
    contract_date = '2024-10-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '340270-01';

UPDATE "MlmMember" SET
    birth_date = '1990-08-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '340270-02';

UPDATE "MlmMember" SET
    birth_date = '1945-07-26 00:00:00+09'::timestamptz,
    contract_date = '2026-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '341850-01';

UPDATE "MlmMember" SET
    birth_date = '1966-12-19 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '342433-01';

UPDATE "MlmMember" SET
    birth_date = '1956-01-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '342971-01';

UPDATE "MlmMember" SET
    birth_date = '1968-06-29 00:00:00+09'::timestamptz,
    contract_date = '2025-05-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-27 00:00:00+09'::timestamptz
  WHERE member_code = '345760-01';

UPDATE "MlmMember" SET
    birth_date = '1975-11-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '346370-01';

UPDATE "MlmMember" SET
    birth_date = '1967-02-21 00:00:00+09'::timestamptz,
    contract_date = '2025-07-16 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-16 00:00:00+09'::timestamptz
  WHERE member_code = '350261-01';

UPDATE "MlmMember" SET
    birth_date = '1965-03-15 00:00:00+09'::timestamptz,
    contract_date = '2024-10-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '351319-01';

UPDATE "MlmMember" SET
    birth_date = '1934-12-22 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '351325-01';

UPDATE "MlmMember" SET
    birth_date = '1957-08-21 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '352828-01';

UPDATE "MlmMember" SET
    birth_date = '1940-06-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '355958-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-21 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '358845-01';

UPDATE "MlmMember" SET
    birth_date = '1949-02-10 00:00:00+09'::timestamptz,
    contract_date = '2025-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '359229-01';

UPDATE "MlmMember" SET
    birth_date = '1960-05-13 00:00:00+09'::timestamptz,
    contract_date = '2024-12-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '359253-01';

UPDATE "MlmMember" SET
    birth_date = '1948-10-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '361809-01';

UPDATE "MlmMember" SET
    birth_date = '1943-05-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '371990-01';

UPDATE "MlmMember" SET
    birth_date = '1978-05-01 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-18 00:00:00+09'::timestamptz
  WHERE member_code = '372649-01';

UPDATE "MlmMember" SET
    birth_date = '1941-08-09 00:00:00+09'::timestamptz,
    contract_date = '2024-11-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '376065-01';

UPDATE "MlmMember" SET
    birth_date = '1958-09-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '377509-01';

UPDATE "MlmMember" SET
    birth_date = '1958-09-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '377509-02';

UPDATE "MlmMember" SET
    birth_date = '1958-09-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '377509-03';

UPDATE "MlmMember" SET
    birth_date = '1958-09-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '377509-04';

UPDATE "MlmMember" SET
    birth_date = '1949-04-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '377619-01';

UPDATE "MlmMember" SET
    birth_date = '1976-08-07 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '377796-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-11-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '382870-01';

UPDATE "MlmMember" SET
    birth_date = '1969-07-10 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '384069-01';

UPDATE "MlmMember" SET
    birth_date = '1955-03-19 00:00:00+09'::timestamptz,
    contract_date = '2025-04-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '384610-01';

UPDATE "MlmMember" SET
    birth_date = '1988-10-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '385633-01';

UPDATE "MlmMember" SET
    birth_date = '1935-10-02 00:00:00+09'::timestamptz,
    contract_date = '2024-10-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '389744-01';

UPDATE "MlmMember" SET
    birth_date = '1935-10-02 00:00:00+09'::timestamptz,
    contract_date = '2025-01-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '389744-02';

UPDATE "MlmMember" SET
    birth_date = '1984-01-12 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '392191-01';

UPDATE "MlmMember" SET
    birth_date = '1949-10-01 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '392357-01';

UPDATE "MlmMember" SET
    birth_date = '1972-02-17 00:00:00+09'::timestamptz,
    contract_date = '2024-10-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '392744-01';

UPDATE "MlmMember" SET
    birth_date = '1954-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '393333-01';

UPDATE "MlmMember" SET
    birth_date = '1954-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '393333-02';

UPDATE "MlmMember" SET
    birth_date = '1954-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '393333-03';

UPDATE "MlmMember" SET
    birth_date = '1962-08-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '394561-01';

UPDATE "MlmMember" SET
    birth_date = '1959-03-26 00:00:00+09'::timestamptz,
    contract_date = '2024-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '395912-01';

UPDATE "MlmMember" SET
    birth_date = '1959-03-26 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '395912-02';

UPDATE "MlmMember" SET
    birth_date = '1959-03-26 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '395912-03';

UPDATE "MlmMember" SET
    birth_date = '1989-11-01 00:00:00+09'::timestamptz,
    contract_date = '2024-10-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '396361-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '399209-01';

UPDATE "MlmMember" SET
    birth_date = '1963-06-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '402057-01';

UPDATE "MlmMember" SET
    birth_date = '1963-06-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '402057-02';

UPDATE "MlmMember" SET
    birth_date = '1958-11-03 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '402206-01';

UPDATE "MlmMember" SET
    birth_date = '1961-07-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '402770-01';

UPDATE "MlmMember" SET
    birth_date = '1955-08-07 00:00:00+09'::timestamptz,
    contract_date = '2025-05-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '403670-01';

UPDATE "MlmMember" SET
    birth_date = '1990-07-22 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '404310-01';

UPDATE "MlmMember" SET
    birth_date = '1968-07-19 00:00:00+09'::timestamptz,
    contract_date = '2025-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '405060-01';

UPDATE "MlmMember" SET
    birth_date = '1959-09-05 00:00:00+09'::timestamptz,
    contract_date = '2024-10-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '406248-01';

UPDATE "MlmMember" SET
    birth_date = '1949-08-16 00:00:00+09'::timestamptz,
    contract_date = '2025-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '406435-01';

UPDATE "MlmMember" SET
    birth_date = '1961-04-26 00:00:00+09'::timestamptz,
    contract_date = '2025-01-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '407277-01';

UPDATE "MlmMember" SET
    birth_date = '1980-10-13 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '407427-01';

UPDATE "MlmMember" SET
    birth_date = '1962-08-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '410351-01';

UPDATE "MlmMember" SET
    birth_date = '1945-02-26 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-20 00:00:00+09'::timestamptz
  WHERE member_code = '411021-01';

UPDATE "MlmMember" SET
    birth_date = '1959-01-01 00:00:00+09'::timestamptz,
    contract_date = '2025-06-16 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-16 00:00:00+09'::timestamptz
  WHERE member_code = '411987-01';

UPDATE "MlmMember" SET
    birth_date = '1973-08-30 00:00:00+09'::timestamptz,
    contract_date = '2025-05-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '414575-01';

UPDATE "MlmMember" SET
    birth_date = '1977-09-30 00:00:00+09'::timestamptz,
    contract_date = '2025-08-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '415515-01';

UPDATE "MlmMember" SET
    birth_date = '1952-02-01 00:00:00+09'::timestamptz,
    contract_date = '2025-07-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-27 00:00:00+09'::timestamptz
  WHERE member_code = '416571-01';

UPDATE "MlmMember" SET
    birth_date = '1965-12-03 00:00:00+09'::timestamptz,
    contract_date = '2025-10-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '417477-01';

UPDATE "MlmMember" SET
    birth_date = '1958-12-09 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '417963-01';

UPDATE "MlmMember" SET
    birth_date = '1972-09-30 00:00:00+09'::timestamptz,
    contract_date = '2026-03-27 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-27 00:00:00+09'::timestamptz
  WHERE member_code = '420115-01';

UPDATE "MlmMember" SET
    birth_date = '1962-12-11 00:00:00+09'::timestamptz,
    contract_date = '2025-04-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '421659-01';

UPDATE "MlmMember" SET
    birth_date = '1954-10-06 00:00:00+09'::timestamptz,
    contract_date = '2024-10-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '422357-01';

UPDATE "MlmMember" SET
    birth_date = '1960-07-05 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '424556-01';

UPDATE "MlmMember" SET
    birth_date = '1956-03-15 00:00:00+09'::timestamptz,
    contract_date = '2024-12-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '424632-01';

UPDATE "MlmMember" SET
    birth_date = '1965-05-26 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '425877-01';

UPDATE "MlmMember" SET
    birth_date = '1965-05-26 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '425877-02';

UPDATE "MlmMember" SET
    birth_date = '1965-05-26 00:00:00+09'::timestamptz,
    contract_date = '2024-09-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '425877-03';

UPDATE "MlmMember" SET
    birth_date = '1958-06-27 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '425915-01';

UPDATE "MlmMember" SET
    birth_date = '1947-08-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '427003-01';

UPDATE "MlmMember" SET
    birth_date = '1949-06-11 00:00:00+09'::timestamptz,
    contract_date = '2025-04-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '427227-01';

UPDATE "MlmMember" SET
    birth_date = '1953-07-30 00:00:00+09'::timestamptz,
    contract_date = '2025-06-03 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-02 00:00:00+09'::timestamptz
  WHERE member_code = '427642-01';

UPDATE "MlmMember" SET
    birth_date = '1958-04-22 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '428455-01';

UPDATE "MlmMember" SET
    birth_date = '1958-04-22 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '428455-02';

UPDATE "MlmMember" SET
    birth_date = '1958-04-22 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '428455-03';

UPDATE "MlmMember" SET
    birth_date = '1999-01-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '428994-01';

UPDATE "MlmMember" SET
    birth_date = '1947-03-21 00:00:00+09'::timestamptz,
    contract_date = '2025-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '430039-01';

UPDATE "MlmMember" SET
    birth_date = '1960-09-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-15 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '430956-01';

UPDATE "MlmMember" SET
    birth_date = '1982-10-26 00:00:00+09'::timestamptz,
    contract_date = '2026-01-29 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-29 00:00:00+09'::timestamptz
  WHERE member_code = '432767-01';

UPDATE "MlmMember" SET
    birth_date = '1983-03-12 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '432923-01';

UPDATE "MlmMember" SET
    birth_date = '1976-01-15 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '432991-01';

UPDATE "MlmMember" SET
    birth_date = '1963-07-04 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '433414-01';

UPDATE "MlmMember" SET
    birth_date = '1969-01-01 00:00:00+09'::timestamptz,
    contract_date = '2025-12-16 00:00:00+09'::timestamptz,
    first_pay_date = '2025-12-16 00:00:00+09'::timestamptz
  WHERE member_code = '433894-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '434025-01';

UPDATE "MlmMember" SET
    birth_date = '1952-09-21 00:00:00+09'::timestamptz,
    contract_date = '2025-01-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '434185-01';

UPDATE "MlmMember" SET
    birth_date = '1963-06-17 00:00:00+09'::timestamptz,
    contract_date = '2025-07-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '436911-01';

UPDATE "MlmMember" SET
    birth_date = '1942-11-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '438460-01';

UPDATE "MlmMember" SET
    birth_date = '1926-01-20 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '439238-01';

UPDATE "MlmMember" SET
    birth_date = '1957-04-25 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '441097-01';

UPDATE "MlmMember" SET
    birth_date = '1986-08-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '441276-01';

UPDATE "MlmMember" SET
    birth_date = '1953-07-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '441461-01';

UPDATE "MlmMember" SET
    birth_date = '1958-10-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '442834-01';

UPDATE "MlmMember" SET
    birth_date = '1957-08-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '443567-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '445047-01';

UPDATE "MlmMember" SET
    birth_date = '1956-02-23 00:00:00+09'::timestamptz,
    contract_date = '2024-12-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '449819-01';

UPDATE "MlmMember" SET
    birth_date = '1969-10-14 00:00:00+09'::timestamptz,
    contract_date = '2025-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '451393-01';

UPDATE "MlmMember" SET
    birth_date = '1946-03-28 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '452803-01';

UPDATE "MlmMember" SET
    birth_date = '1950-10-25 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '452811-01';

UPDATE "MlmMember" SET
    birth_date = '1964-12-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '454460-01';

UPDATE "MlmMember" SET
    birth_date = '1972-06-28 00:00:00+09'::timestamptz,
    contract_date = '2025-05-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '454478-01';

UPDATE "MlmMember" SET
    birth_date = '1945-05-18 00:00:00+09'::timestamptz,
    contract_date = '2025-04-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-04-23 00:00:00+09'::timestamptz
  WHERE member_code = '455863-01';

UPDATE "MlmMember" SET
    birth_date = '1955-02-03 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '456793-01';

UPDATE "MlmMember" SET
    birth_date = '1983-09-09 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '456972-01';

UPDATE "MlmMember" SET
    birth_date = '1964-06-16 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '457361-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-12-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '462513-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '463337-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '463337-02';

UPDATE "MlmMember" SET
    birth_date = '1963-05-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '463337-03';

UPDATE "MlmMember" SET
    birth_date = '1963-05-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '463337-04';

UPDATE "MlmMember" SET
    birth_date = '1958-04-23 00:00:00+09'::timestamptz,
    contract_date = '2024-10-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '463911-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-24 00:00:00+09'::timestamptz,
    contract_date = '2024-11-02 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '464357-01';

UPDATE "MlmMember" SET
    birth_date = '1980-01-14 00:00:00+09'::timestamptz,
    contract_date = '2024-12-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '464691-01';

UPDATE "MlmMember" SET
    birth_date = '1978-09-10 00:00:00+09'::timestamptz,
    contract_date = '2025-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '467277-01';

UPDATE "MlmMember" SET
    birth_date = '1948-08-28 00:00:00+09'::timestamptz,
    contract_date = '2025-06-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-13 00:00:00+09'::timestamptz
  WHERE member_code = '467279-01';

UPDATE "MlmMember" SET
    birth_date = '1983-01-28 00:00:00+09'::timestamptz,
    contract_date = '2025-08-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '467859-01';

UPDATE "MlmMember" SET
    birth_date = '1970-07-23 00:00:00+09'::timestamptz,
    contract_date = '2025-02-21 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '469537-01';

UPDATE "MlmMember" SET
    birth_date = '1930-10-12 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '470150-01';

UPDATE "MlmMember" SET
    birth_date = '1959-07-28 00:00:00+09'::timestamptz,
    contract_date = '2024-12-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '473568-01';

UPDATE "MlmMember" SET
    birth_date = '1959-07-28 00:00:00+09'::timestamptz,
    contract_date = '2024-12-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '473568-02';

UPDATE "MlmMember" SET
    birth_date = '1959-07-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '473568-03';

UPDATE "MlmMember" SET
    birth_date = '1959-07-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '473568-04';

UPDATE "MlmMember" SET
    birth_date = '1973-03-04 00:00:00+09'::timestamptz,
    contract_date = '2026-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '473791-01';

UPDATE "MlmMember" SET
    birth_date = '1949-09-04 00:00:00+09'::timestamptz,
    contract_date = '2026-03-11 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-11 00:00:00+09'::timestamptz
  WHERE member_code = '474965-01';

UPDATE "MlmMember" SET
    birth_date = '1950-11-29 00:00:00+09'::timestamptz,
    contract_date = '2024-11-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '476513-01';

UPDATE "MlmMember" SET
    birth_date = '1950-11-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '476513-02';

UPDATE "MlmMember" SET
    birth_date = '1951-09-19 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '477165-01';

UPDATE "MlmMember" SET
    birth_date = '1965-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '478254-01';

UPDATE "MlmMember" SET
    birth_date = '1961-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '483440-01';

UPDATE "MlmMember" SET
    birth_date = '1961-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '483440-02';

UPDATE "MlmMember" SET
    birth_date = '1961-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-10-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '483440-03';

UPDATE "MlmMember" SET
    birth_date = '1960-06-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '485454-01';

UPDATE "MlmMember" SET
    birth_date = '1955-01-27 00:00:00+09'::timestamptz,
    contract_date = '2024-10-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '485591-01';

UPDATE "MlmMember" SET
    birth_date = '1947-10-23 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '485989-01';

UPDATE "MlmMember" SET
    birth_date = '1947-10-23 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '485989-02';

UPDATE "MlmMember" SET
    birth_date = '1943-02-01 00:00:00+09'::timestamptz,
    contract_date = '2024-12-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '487434-01';

UPDATE "MlmMember" SET
    birth_date = '1943-02-01 00:00:00+09'::timestamptz,
    contract_date = '2025-03-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '487434-02';

UPDATE "MlmMember" SET
    birth_date = '1982-06-08 00:00:00+09'::timestamptz,
    contract_date = '2025-04-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '487438-01';

UPDATE "MlmMember" SET
    birth_date = '1973-02-21 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '488061-01';

UPDATE "MlmMember" SET
    birth_date = '1966-04-22 00:00:00+09'::timestamptz,
    contract_date = '2026-02-19 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-19 00:00:00+09'::timestamptz
  WHERE member_code = '488957-01';

UPDATE "MlmMember" SET
    birth_date = '1981-11-29 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '490306-01';

UPDATE "MlmMember" SET
    birth_date = '1970-06-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '493323-01';

UPDATE "MlmMember" SET
    birth_date = '1962-05-05 00:00:00+09'::timestamptz,
    contract_date = '2025-08-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-08-31 00:00:00+09'::timestamptz
  WHERE member_code = '493415-01';

UPDATE "MlmMember" SET
    birth_date = '1975-08-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '493971-01';

UPDATE "MlmMember" SET
    birth_date = '1965-09-21 00:00:00+09'::timestamptz,
    contract_date = '2025-10-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-10-30 00:00:00+09'::timestamptz
  WHERE member_code = '495096-01';

UPDATE "MlmMember" SET
    birth_date = '1960-01-14 00:00:00+09'::timestamptz,
    contract_date = '2025-06-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '495125-01';

UPDATE "MlmMember" SET
    birth_date = '1969-02-16 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '496818-01';

UPDATE "MlmMember" SET
    birth_date = '1959-01-01 00:00:00+09'::timestamptz,
    contract_date = '2024-10-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '497646-01';

UPDATE "MlmMember" SET
    birth_date = '1954-10-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '499876-01';

UPDATE "MlmMember" SET
    birth_date = '1948-06-10 00:00:00+09'::timestamptz,
    contract_date = '2025-02-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '500300-01';

UPDATE "MlmMember" SET
    birth_date = '1991-03-30 00:00:00+09'::timestamptz,
    contract_date = '2025-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '501240-01';

UPDATE "MlmMember" SET
    birth_date = '1966-02-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '501522-01';

UPDATE "MlmMember" SET
    birth_date = '1974-06-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '501677-01';

UPDATE "MlmMember" SET
    birth_date = '1964-10-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '502732-01';

UPDATE "MlmMember" SET
    birth_date = '1951-04-24 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '504731-01';

UPDATE "MlmMember" SET
    birth_date = '1971-03-23 00:00:00+09'::timestamptz,
    contract_date = '2024-10-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '506147-01';

UPDATE "MlmMember" SET
    birth_date = '1981-11-15 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '509276-01';

UPDATE "MlmMember" SET
    birth_date = '1970-06-29 00:00:00+09'::timestamptz,
    contract_date = '2024-11-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '509370-01';

UPDATE "MlmMember" SET
    birth_date = '1943-04-06 00:00:00+09'::timestamptz,
    contract_date = '2024-11-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '514164-01';

UPDATE "MlmMember" SET
    birth_date = '1979-12-21 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '515566-01';

UPDATE "MlmMember" SET
    birth_date = '1965-05-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-02 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '518489-01';

UPDATE "MlmMember" SET
    birth_date = '1990-12-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '526494-01';

UPDATE "MlmMember" SET
    birth_date = '1945-03-16 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '534587-01';

UPDATE "MlmMember" SET
    birth_date = '1946-09-29 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '536064-01';

UPDATE "MlmMember" SET
    birth_date = '1946-09-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '536064-02';

UPDATE "MlmMember" SET
    birth_date = '1960-08-14 00:00:00+09'::timestamptz,
    contract_date = '2024-12-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '536261-01';

UPDATE "MlmMember" SET
    birth_date = '1972-02-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '536313-01';

UPDATE "MlmMember" SET
    birth_date = '1944-06-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '536890-01';

UPDATE "MlmMember" SET
    birth_date = '1957-05-20 00:00:00+09'::timestamptz,
    contract_date = '2026-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-31 00:00:00+09'::timestamptz
  WHERE member_code = '537718-01';

UPDATE "MlmMember" SET
    birth_date = '1979-07-19 00:00:00+09'::timestamptz,
    contract_date = '2025-05-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '542407-01';

UPDATE "MlmMember" SET
    birth_date = '1967-02-22 00:00:00+09'::timestamptz,
    contract_date = '2025-06-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-23 00:00:00+09'::timestamptz
  WHERE member_code = '543734-01';

UPDATE "MlmMember" SET
    birth_date = '1964-08-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '544182-01';

UPDATE "MlmMember" SET
    birth_date = '1964-08-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '544182-02';

UPDATE "MlmMember" SET
    birth_date = '1964-08-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '544182-03';

UPDATE "MlmMember" SET
    birth_date = '1965-09-29 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '544802-01';

UPDATE "MlmMember" SET
    birth_date = '1958-01-17 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '545987-01';

UPDATE "MlmMember" SET
    birth_date = '1958-01-17 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '545987-02';

UPDATE "MlmMember" SET
    birth_date = '1958-01-17 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-24 00:00:00+09'::timestamptz
  WHERE member_code = '545987-03';

UPDATE "MlmMember" SET
    birth_date = '1973-08-01 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '546193-01';

UPDATE "MlmMember" SET
    birth_date = '1973-08-01 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '546193-02';

UPDATE "MlmMember" SET
    birth_date = '1954-05-24 00:00:00+09'::timestamptz,
    contract_date = '2025-03-15 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-17 00:00:00+09'::timestamptz
  WHERE member_code = '547303-01';

UPDATE "MlmMember" SET
    birth_date = '1945-02-13 00:00:00+09'::timestamptz,
    contract_date = '2024-12-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '551659-01';

UPDATE "MlmMember" SET
    birth_date = '1951-11-05 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '556861-01';

UPDATE "MlmMember" SET
    birth_date = '1951-11-05 00:00:00+09'::timestamptz,
    contract_date = '2025-01-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '556861-02';

UPDATE "MlmMember" SET
    birth_date = '1955-10-18 00:00:00+09'::timestamptz,
    contract_date = '2025-01-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '561055-01';

UPDATE "MlmMember" SET
    birth_date = '1968-01-15 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '564031-01';

UPDATE "MlmMember" SET
    birth_date = '1954-12-06 00:00:00+09'::timestamptz,
    contract_date = '2025-06-18 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-02 00:00:00+09'::timestamptz
  WHERE member_code = '564104-01';

UPDATE "MlmMember" SET
    birth_date = '1957-03-01 00:00:00+09'::timestamptz,
    contract_date = '2025-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '564562-01';

UPDATE "MlmMember" SET
    birth_date = '1960-12-04 00:00:00+09'::timestamptz,
    contract_date = '2024-12-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '567484-01';

UPDATE "MlmMember" SET
    birth_date = '1979-08-24 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '568473-01';

UPDATE "MlmMember" SET
    birth_date = '1987-03-04 00:00:00+09'::timestamptz,
    contract_date = '2025-11-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '569268-01';

UPDATE "MlmMember" SET
    birth_date = '1959-04-20 00:00:00+09'::timestamptz,
    contract_date = '2024-12-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '572514-01';

UPDATE "MlmMember" SET
    birth_date = '1975-11-01 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '574031-01';

UPDATE "MlmMember" SET
    birth_date = '1984-02-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '576974-01';

UPDATE "MlmMember" SET
    birth_date = '1950-02-23 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '580542-01';

UPDATE "MlmMember" SET
    birth_date = '1981-01-09 00:00:00+09'::timestamptz,
    contract_date = '2024-11-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '582011-01';

UPDATE "MlmMember" SET
    birth_date = '1924-10-10 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '582538-01';

UPDATE "MlmMember" SET
    birth_date = '1959-02-20 00:00:00+09'::timestamptz,
    contract_date = '2024-11-02 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '583440-01';

UPDATE "MlmMember" SET
    birth_date = '1942-03-10 00:00:00+09'::timestamptz,
    contract_date = '2025-05-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-22 00:00:00+09'::timestamptz
  WHERE member_code = '585975-01';

UPDATE "MlmMember" SET
    birth_date = '1999-03-17 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '587954-01';

UPDATE "MlmMember" SET
    birth_date = '1967-11-15 00:00:00+09'::timestamptz,
    contract_date = '2025-05-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '588450-01';

UPDATE "MlmMember" SET
    birth_date = '1985-03-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '590721-01';

UPDATE "MlmMember" SET
    birth_date = '1946-02-11 00:00:00+09'::timestamptz,
    contract_date = '2025-01-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '590872-01';

UPDATE "MlmMember" SET
    birth_date = '1941-03-07 00:00:00+09'::timestamptz,
    contract_date = '2024-12-02 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '595754-01';

UPDATE "MlmMember" SET
    birth_date = '1963-06-17 00:00:00+09'::timestamptz,
    contract_date = '2024-12-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '598323-01';

UPDATE "MlmMember" SET
    birth_date = '1960-01-08 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '598452-01';

UPDATE "MlmMember" SET
    birth_date = '1957-05-05 00:00:00+09'::timestamptz,
    contract_date = '2026-03-20 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-20 00:00:00+09'::timestamptz
  WHERE member_code = '599013-01';

UPDATE "MlmMember" SET
    birth_date = '1940-04-02 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '602137-01';

UPDATE "MlmMember" SET
    birth_date = '1972-09-11 00:00:00+09'::timestamptz,
    contract_date = '2025-07-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '603032-01';

UPDATE "MlmMember" SET
    birth_date = '1936-02-15 00:00:00+09'::timestamptz,
    contract_date = '2024-12-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '603707-01';

UPDATE "MlmMember" SET
    birth_date = '1969-01-04 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-31 00:00:00+09'::timestamptz
  WHERE member_code = '605841-01';

UPDATE "MlmMember" SET
    birth_date = '1941-12-08 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '606474-01';

UPDATE "MlmMember" SET
    birth_date = '1954-08-15 00:00:00+09'::timestamptz,
    contract_date = '2025-12-18 00:00:00+09'::timestamptz,
    first_pay_date = '2025-12-18 00:00:00+09'::timestamptz
  WHERE member_code = '606493-01';

UPDATE "MlmMember" SET
    birth_date = '1971-11-16 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '609002-01';

UPDATE "MlmMember" SET
    birth_date = '1973-04-04 00:00:00+09'::timestamptz,
    contract_date = '2026-02-19 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-19 00:00:00+09'::timestamptz
  WHERE member_code = '609622-01';

UPDATE "MlmMember" SET
    birth_date = '1982-05-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '609881-01';

UPDATE "MlmMember" SET
    birth_date = '1982-05-22 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-21 00:00:00+09'::timestamptz
  WHERE member_code = '609881-02';

UPDATE "MlmMember" SET
    birth_date = '1950-01-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '610125-01';

UPDATE "MlmMember" SET
    birth_date = '1950-01-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '610125-02';

UPDATE "MlmMember" SET
    birth_date = '1950-01-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '610125-03';

UPDATE "MlmMember" SET
    birth_date = '1950-01-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '610125-04';

UPDATE "MlmMember" SET
    birth_date = '1952-12-05 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '611704-01';

UPDATE "MlmMember" SET
    birth_date = '1974-03-29 00:00:00+09'::timestamptz,
    contract_date = '2024-10-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '612254-01';

UPDATE "MlmMember" SET
    birth_date = '1958-07-04 00:00:00+09'::timestamptz,
    contract_date = '2026-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '616326-01';

UPDATE "MlmMember" SET
    birth_date = '1968-02-17 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '620128-01';

UPDATE "MlmMember" SET
    birth_date = '1968-02-17 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '620128-02';

UPDATE "MlmMember" SET
    birth_date = '1968-02-17 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '620128-03';

UPDATE "MlmMember" SET
    birth_date = '1968-02-17 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '620128-04';

UPDATE "MlmMember" SET
    birth_date = '1965-01-17 00:00:00+09'::timestamptz,
    contract_date = '2025-01-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '621147-01';

UPDATE "MlmMember" SET
    birth_date = '1954-09-05 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '621472-01';

UPDATE "MlmMember" SET
    birth_date = '1955-03-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '622108-01';

UPDATE "MlmMember" SET
    birth_date = '1956-01-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '623217-01';

UPDATE "MlmMember" SET
    birth_date = '1950-05-10 00:00:00+09'::timestamptz,
    contract_date = '2024-12-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '623395-01';

UPDATE "MlmMember" SET
    birth_date = '1965-03-20 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '623504-01';

UPDATE "MlmMember" SET
    birth_date = '1950-07-12 00:00:00+09'::timestamptz,
    contract_date = '2025-04-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '624278-01';

UPDATE "MlmMember" SET
    birth_date = '1968-09-19 00:00:00+09'::timestamptz,
    contract_date = '2025-07-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '625956-01';

UPDATE "MlmMember" SET
    birth_date = '1967-12-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-17 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-17 00:00:00+09'::timestamptz
  WHERE member_code = '629361-01';

UPDATE "MlmMember" SET
    birth_date = '1952-12-26 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '630884-01';

UPDATE "MlmMember" SET
    birth_date = '1946-10-30 00:00:00+09'::timestamptz,
    contract_date = '2025-05-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '631611-01';

UPDATE "MlmMember" SET
    birth_date = '1965-08-18 00:00:00+09'::timestamptz,
    contract_date = '2025-05-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-28 00:00:00+09'::timestamptz
  WHERE member_code = '635374-01';

UPDATE "MlmMember" SET
    birth_date = '1988-02-08 00:00:00+09'::timestamptz,
    contract_date = '2025-06-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '636342-01';

UPDATE "MlmMember" SET
    birth_date = '1940-11-24 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '636363-01';

UPDATE "MlmMember" SET
    birth_date = '1952-05-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '637876-01';

UPDATE "MlmMember" SET
    birth_date = '1949-12-26 00:00:00+09'::timestamptz,
    contract_date = '2025-07-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-31 00:00:00+09'::timestamptz
  WHERE member_code = '638937-01';

UPDATE "MlmMember" SET
    birth_date = '1975-08-27 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '640728-01';

UPDATE "MlmMember" SET
    birth_date = '1988-12-16 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '641501-01';

UPDATE "MlmMember" SET
    birth_date = '1955-11-23 00:00:00+09'::timestamptz,
    contract_date = '2026-01-30 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-30 00:00:00+09'::timestamptz
  WHERE member_code = '644327-01';

UPDATE "MlmMember" SET
    birth_date = '1967-02-02 00:00:00+09'::timestamptz,
    contract_date = '2024-12-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '644521-01';

UPDATE "MlmMember" SET
    birth_date = '1960-08-21 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '646970-01';

UPDATE "MlmMember" SET
    birth_date = '1960-08-21 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '646970-02';

UPDATE "MlmMember" SET
    birth_date = '1960-08-21 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '646970-03';

UPDATE "MlmMember" SET
    birth_date = '1958-09-01 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '647308-01';

UPDATE "MlmMember" SET
    birth_date = '1937-01-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '648078-01';

UPDATE "MlmMember" SET
    birth_date = '1943-06-11 00:00:00+09'::timestamptz,
    contract_date = '2024-12-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '650483-01';

UPDATE "MlmMember" SET
    birth_date = '1958-12-10 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '654665-01';

UPDATE "MlmMember" SET
    birth_date = '1958-12-10 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '654665-02';

UPDATE "MlmMember" SET
    birth_date = '1949-10-15 00:00:00+09'::timestamptz,
    contract_date = '2025-09-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '654936-01';

UPDATE "MlmMember" SET
    birth_date = '1975-08-28 00:00:00+09'::timestamptz,
    contract_date = '2024-11-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '657080-01';

UPDATE "MlmMember" SET
    birth_date = '1975-08-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '657080-02';

UPDATE "MlmMember" SET
    birth_date = '1975-08-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '657080-03';

UPDATE "MlmMember" SET
    birth_date = '1953-08-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '658916-01';

UPDATE "MlmMember" SET
    birth_date = '1953-08-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-03 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '658916-02';

UPDATE "MlmMember" SET
    birth_date = '1938-02-27 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '658959-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-12-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '659024-01';

UPDATE "MlmMember" SET
    birth_date = '1950-05-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '663487-01';

UPDATE "MlmMember" SET
    birth_date = '1994-06-10 00:00:00+09'::timestamptz,
    contract_date = '2026-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '663837-01';

UPDATE "MlmMember" SET
    birth_date = '1953-03-08 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '664159-01';

UPDATE "MlmMember" SET
    birth_date = '1953-03-08 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '664159-02';

UPDATE "MlmMember" SET
    birth_date = '1953-03-08 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '664159-03';

UPDATE "MlmMember" SET
    birth_date = '1959-01-19 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '665117-01';

UPDATE "MlmMember" SET
    birth_date = '1959-04-01 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '667670-01';

UPDATE "MlmMember" SET
    birth_date = '1999-06-30 00:00:00+09'::timestamptz,
    contract_date = '2026-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '667975-01';

UPDATE "MlmMember" SET
    birth_date = '1947-01-26 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-17 00:00:00+09'::timestamptz
  WHERE member_code = '671205-01';

UPDATE "MlmMember" SET
    birth_date = '1947-02-12 00:00:00+09'::timestamptz,
    contract_date = '2025-10-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '673023-01';

UPDATE "MlmMember" SET
    birth_date = '1932-05-24 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '674791-01';

UPDATE "MlmMember" SET
    birth_date = '1969-08-19 00:00:00+09'::timestamptz,
    contract_date = '2025-08-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '675344-01';

UPDATE "MlmMember" SET
    birth_date = '1946-09-18 00:00:00+09'::timestamptz,
    contract_date = '2025-01-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '676279-01';

UPDATE "MlmMember" SET
    birth_date = '1946-09-18 00:00:00+09'::timestamptz,
    contract_date = '2025-03-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-24 00:00:00+09'::timestamptz
  WHERE member_code = '676279-02';

UPDATE "MlmMember" SET
    birth_date = '1962-07-01 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '677107-01';

UPDATE "MlmMember" SET
    birth_date = '1967-04-28 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-23 00:00:00+09'::timestamptz
  WHERE member_code = '678127-01';

UPDATE "MlmMember" SET
    birth_date = '1986-06-13 00:00:00+09'::timestamptz,
    contract_date = '2025-05-09 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-09 00:00:00+09'::timestamptz
  WHERE member_code = '679982-01';

UPDATE "MlmMember" SET
    birth_date = '1945-01-02 00:00:00+09'::timestamptz,
    contract_date = '2025-01-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '682732-01';

UPDATE "MlmMember" SET
    birth_date = '1969-02-19 00:00:00+09'::timestamptz,
    contract_date = '2025-05-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '684192-01';

UPDATE "MlmMember" SET
    birth_date = '2001-02-05 00:00:00+09'::timestamptz,
    contract_date = '2026-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '684290-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-11-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '685218-01';

UPDATE "MlmMember" SET
    birth_date = '1945-10-01 00:00:00+09'::timestamptz,
    contract_date = '2025-02-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '685324-01';

UPDATE "MlmMember" SET
    birth_date = '1957-04-14 00:00:00+09'::timestamptz,
    contract_date = '2024-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '686736-01';

UPDATE "MlmMember" SET
    birth_date = '1957-04-14 00:00:00+09'::timestamptz,
    contract_date = '2024-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '686736-02';

UPDATE "MlmMember" SET
    birth_date = '1957-04-14 00:00:00+09'::timestamptz,
    contract_date = '2024-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '686736-03';

UPDATE "MlmMember" SET
    birth_date = '1971-12-14 00:00:00+09'::timestamptz,
    contract_date = '2025-05-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-13 00:00:00+09'::timestamptz
  WHERE member_code = '687911-01';

UPDATE "MlmMember" SET
    birth_date = '1953-11-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '689344-01';

UPDATE "MlmMember" SET
    birth_date = '1953-11-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '689344-02';

UPDATE "MlmMember" SET
    birth_date = '1987-03-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '689660-01';

UPDATE "MlmMember" SET
    birth_date = '1995-12-23 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '692995-01';

UPDATE "MlmMember" SET
    birth_date = '1956-05-18 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '693195-01';

UPDATE "MlmMember" SET
    birth_date = '1956-05-18 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '693195-02';

UPDATE "MlmMember" SET
    birth_date = '1970-09-03 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '695719-01';

UPDATE "MlmMember" SET
    birth_date = '2005-01-17 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '697731-01';

UPDATE "MlmMember" SET
    birth_date = '1957-05-03 00:00:00+09'::timestamptz,
    contract_date = '2025-04-05 00:00:00+09'::timestamptz,
    first_pay_date = '2025-04-05 00:00:00+09'::timestamptz
  WHERE member_code = '697860-01';

UPDATE "MlmMember" SET
    birth_date = '1983-09-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '699163-01';

UPDATE "MlmMember" SET
    birth_date = '1969-05-28 00:00:00+09'::timestamptz,
    contract_date = '2025-01-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '699693-01';

UPDATE "MlmMember" SET
    birth_date = '1942-05-05 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-29 00:00:00+09'::timestamptz
  WHERE member_code = '700509-01';

UPDATE "MlmMember" SET
    birth_date = '1973-07-31 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '701145-01';

UPDATE "MlmMember" SET
    birth_date = '1959-05-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '701806-01';

UPDATE "MlmMember" SET
    birth_date = '1947-03-02 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-23 00:00:00+09'::timestamptz
  WHERE member_code = '702129-01';

UPDATE "MlmMember" SET
    birth_date = '1996-03-31 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '702410-01';

UPDATE "MlmMember" SET
    birth_date = '1951-06-09 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '703793-01';

UPDATE "MlmMember" SET
    birth_date = '1956-04-10 00:00:00+09'::timestamptz,
    contract_date = '2025-02-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '704317-01';

UPDATE "MlmMember" SET
    birth_date = '1973-05-23 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '704742-01';

UPDATE "MlmMember" SET
    birth_date = '1973-05-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-21 00:00:00+09'::timestamptz
  WHERE member_code = '704742-02';

UPDATE "MlmMember" SET
    birth_date = '1959-06-14 00:00:00+09'::timestamptz,
    contract_date = '2024-10-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '706797-01';

UPDATE "MlmMember" SET
    birth_date = '1957-06-20 00:00:00+09'::timestamptz,
    contract_date = '2025-06-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '711172-01';

UPDATE "MlmMember" SET
    birth_date = '1974-08-20 00:00:00+09'::timestamptz,
    contract_date = '2025-02-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '714929-01';

UPDATE "MlmMember" SET
    birth_date = '1968-06-05 00:00:00+09'::timestamptz,
    contract_date = '2025-07-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-26 00:00:00+09'::timestamptz
  WHERE member_code = '714947-01';

UPDATE "MlmMember" SET
    birth_date = '1977-06-08 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '715835-01';

UPDATE "MlmMember" SET
    birth_date = '1976-06-05 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '719853-01';

UPDATE "MlmMember" SET
    birth_date = '1961-01-02 00:00:00+09'::timestamptz,
    contract_date = '2024-12-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '720734-01';

UPDATE "MlmMember" SET
    birth_date = '1961-01-02 00:00:00+09'::timestamptz,
    contract_date = '2024-12-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '720734-02';

UPDATE "MlmMember" SET
    birth_date = '1961-01-02 00:00:00+09'::timestamptz,
    contract_date = '2024-12-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '720734-03';

UPDATE "MlmMember" SET
    birth_date = '1946-01-24 00:00:00+09'::timestamptz,
    contract_date = '2024-10-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '720739-01';

UPDATE "MlmMember" SET
    birth_date = '1968-06-08 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-28 00:00:00+09'::timestamptz
  WHERE member_code = '722768-01';

UPDATE "MlmMember" SET
    birth_date = '1966-01-26 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '723955-01';

UPDATE "MlmMember" SET
    birth_date = '1966-01-26 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '723955-02';

UPDATE "MlmMember" SET
    birth_date = '1953-11-13 00:00:00+09'::timestamptz,
    contract_date = '2025-07-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '725333-01';

UPDATE "MlmMember" SET
    birth_date = '1961-12-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '726128-01';

UPDATE "MlmMember" SET
    birth_date = '1950-04-05 00:00:00+09'::timestamptz,
    contract_date = '2025-08-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-08-13 00:00:00+09'::timestamptz
  WHERE member_code = '727065-01';

UPDATE "MlmMember" SET
    birth_date = '1960-01-11 00:00:00+09'::timestamptz,
    contract_date = '2025-01-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '728779-01';

UPDATE "MlmMember" SET
    birth_date = '1965-09-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '729115-01';

UPDATE "MlmMember" SET
    birth_date = '1965-09-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '729115-02';

UPDATE "MlmMember" SET
    birth_date = '1965-09-11 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '729115-03';

UPDATE "MlmMember" SET
    birth_date = '1946-05-31 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '733074-01';

UPDATE "MlmMember" SET
    birth_date = '1958-10-20 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '735420-01';

UPDATE "MlmMember" SET
    birth_date = '1985-09-26 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '742929-01';

UPDATE "MlmMember" SET
    birth_date = '1964-03-06 00:00:00+09'::timestamptz,
    contract_date = '2025-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '743176-01';

UPDATE "MlmMember" SET
    birth_date = '1953-05-02 00:00:00+09'::timestamptz,
    contract_date = '2024-11-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '747611-01';

UPDATE "MlmMember" SET
    birth_date = '1984-07-23 00:00:00+09'::timestamptz,
    contract_date = '2024-11-11 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '748161-01';

UPDATE "MlmMember" SET
    birth_date = '1949-01-28 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '749162-01';

UPDATE "MlmMember" SET
    birth_date = '1985-08-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '749995-01';

UPDATE "MlmMember" SET
    birth_date = '1952-10-29 00:00:00+09'::timestamptz,
    contract_date = '2025-01-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '752926-01';

UPDATE "MlmMember" SET
    birth_date = '1949-05-16 00:00:00+09'::timestamptz,
    contract_date = '2025-06-20 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-18 00:00:00+09'::timestamptz
  WHERE member_code = '754924-01';

UPDATE "MlmMember" SET
    birth_date = '1978-05-27 00:00:00+09'::timestamptz,
    contract_date = '2024-10-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '761613-01';

UPDATE "MlmMember" SET
    birth_date = '1978-05-27 00:00:00+09'::timestamptz,
    contract_date = '2024-10-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '761613-02';

UPDATE "MlmMember" SET
    birth_date = '1978-05-27 00:00:00+09'::timestamptz,
    contract_date = '2024-10-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '761613-03';

UPDATE "MlmMember" SET
    birth_date = '1978-05-27 00:00:00+09'::timestamptz,
    contract_date = '2024-10-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '761613-04';

UPDATE "MlmMember" SET
    birth_date = '1989-12-19 00:00:00+09'::timestamptz,
    contract_date = '2025-02-23 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-23 00:00:00+09'::timestamptz
  WHERE member_code = '762865-01';

UPDATE "MlmMember" SET
    birth_date = '1956-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '763487-01';

UPDATE "MlmMember" SET
    birth_date = '1956-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '763487-02';

UPDATE "MlmMember" SET
    birth_date = '1956-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '763487-03';

UPDATE "MlmMember" SET
    birth_date = '1969-10-15 00:00:00+09'::timestamptz,
    contract_date = '2026-05-02 00:00:00+09'::timestamptz,
    first_pay_date = '2026-05-02 00:00:00+09'::timestamptz
  WHERE member_code = '767007-01';

UPDATE "MlmMember" SET
    birth_date = '1951-05-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '768130-01';

UPDATE "MlmMember" SET
    birth_date = '1957-10-28 00:00:00+09'::timestamptz,
    contract_date = '2024-12-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '772396-01';

UPDATE "MlmMember" SET
    birth_date = '1952-02-03 00:00:00+09'::timestamptz,
    contract_date = '2024-09-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '772830-01';

UPDATE "MlmMember" SET
    birth_date = '1952-02-03 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-27 00:00:00+09'::timestamptz
  WHERE member_code = '772830-02';

UPDATE "MlmMember" SET
    birth_date = '1990-10-24 00:00:00+09'::timestamptz,
    contract_date = NULL,
    first_pay_date = NULL
  WHERE member_code = '774781-01';

UPDATE "MlmMember" SET
    birth_date = '1950-10-09 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '775391-01';

UPDATE "MlmMember" SET
    birth_date = '1935-07-31 00:00:00+09'::timestamptz,
    contract_date = '2024-12-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '776458-01';

UPDATE "MlmMember" SET
    birth_date = '1958-12-08 00:00:00+09'::timestamptz,
    contract_date = '2025-07-02 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-02 00:00:00+09'::timestamptz
  WHERE member_code = '778817-01';

UPDATE "MlmMember" SET
    birth_date = '1947-09-16 00:00:00+09'::timestamptz,
    contract_date = '2025-05-24 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-24 00:00:00+09'::timestamptz
  WHERE member_code = '781086-01';

UPDATE "MlmMember" SET
    birth_date = '1958-12-17 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '782818-01';

UPDATE "MlmMember" SET
    birth_date = '1996-03-13 00:00:00+09'::timestamptz,
    contract_date = '2025-01-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '787374-01';

UPDATE "MlmMember" SET
    birth_date = '2001-01-24 00:00:00+09'::timestamptz,
    contract_date = '2025-08-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '788805-01';

UPDATE "MlmMember" SET
    birth_date = '1990-07-16 00:00:00+09'::timestamptz,
    contract_date = '2025-11-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '789964-01';

UPDATE "MlmMember" SET
    birth_date = '1983-08-03 00:00:00+09'::timestamptz,
    contract_date = '2024-12-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '790277-01';

UPDATE "MlmMember" SET
    birth_date = '1974-01-22 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '792158-01';

UPDATE "MlmMember" SET
    birth_date = '1948-12-28 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '795059-01';

UPDATE "MlmMember" SET
    birth_date = '1972-08-17 00:00:00+09'::timestamptz,
    contract_date = '2025-07-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-24 00:00:00+09'::timestamptz
  WHERE member_code = '796254-01';

UPDATE "MlmMember" SET
    birth_date = '1957-10-16 00:00:00+09'::timestamptz,
    contract_date = '2025-07-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-26 00:00:00+09'::timestamptz
  WHERE member_code = '799571-01';

UPDATE "MlmMember" SET
    birth_date = '1980-01-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '800243-01';

UPDATE "MlmMember" SET
    birth_date = '1990-06-12 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '800417-01';

UPDATE "MlmMember" SET
    birth_date = '1967-03-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '800420-01';

UPDATE "MlmMember" SET
    birth_date = '1963-05-08 00:00:00+09'::timestamptz,
    contract_date = '2025-07-29 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-29 00:00:00+09'::timestamptz
  WHERE member_code = '802963-01';

UPDATE "MlmMember" SET
    birth_date = '1978-05-01 00:00:00+09'::timestamptz,
    contract_date = '2024-12-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '805124-01';

UPDATE "MlmMember" SET
    birth_date = '1953-02-08 00:00:00+09'::timestamptz,
    contract_date = '2025-02-16 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '805182-01';

UPDATE "MlmMember" SET
    birth_date = '1991-06-15 00:00:00+09'::timestamptz,
    contract_date = '2026-05-01 00:00:00+09'::timestamptz,
    first_pay_date = '2026-05-01 00:00:00+09'::timestamptz
  WHERE member_code = '805219-01';

UPDATE "MlmMember" SET
    birth_date = '1996-07-30 00:00:00+09'::timestamptz,
    contract_date = '2025-06-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '810359-01';

UPDATE "MlmMember" SET
    birth_date = '1962-08-07 00:00:00+09'::timestamptz,
    contract_date = '2025-01-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '812551-01';

UPDATE "MlmMember" SET
    birth_date = '1965-12-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '813551-01';

UPDATE "MlmMember" SET
    birth_date = '1942-09-18 00:00:00+09'::timestamptz,
    contract_date = '2025-05-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-30 00:00:00+09'::timestamptz
  WHERE member_code = '813907-01';

UPDATE "MlmMember" SET
    birth_date = '1951-03-19 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '818983-01';

UPDATE "MlmMember" SET
    birth_date = '1951-03-17 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '819860-01';

UPDATE "MlmMember" SET
    birth_date = '1951-03-17 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '819860-02';

UPDATE "MlmMember" SET
    birth_date = '1956-11-30 00:00:00+09'::timestamptz,
    contract_date = '2024-10-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '820640-01';

UPDATE "MlmMember" SET
    birth_date = '1990-04-18 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '821795-01';

UPDATE "MlmMember" SET
    birth_date = '1990-04-18 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '821795-02';

UPDATE "MlmMember" SET
    birth_date = '1974-08-23 00:00:00+09'::timestamptz,
    contract_date = '2026-03-06 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-06 00:00:00+09'::timestamptz
  WHERE member_code = '822124-01';

UPDATE "MlmMember" SET
    birth_date = '1990-11-21 00:00:00+09'::timestamptz,
    contract_date = '2025-10-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '822949-01';

UPDATE "MlmMember" SET
    birth_date = '1951-07-30 00:00:00+09'::timestamptz,
    contract_date = '2025-01-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '826483-01';

UPDATE "MlmMember" SET
    birth_date = '2000-09-10 00:00:00+09'::timestamptz,
    contract_date = '2024-12-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '827090-01';

UPDATE "MlmMember" SET
    birth_date = '1980-03-05 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '827529-01';

UPDATE "MlmMember" SET
    birth_date = '1951-05-06 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '829383-01';

UPDATE "MlmMember" SET
    birth_date = '1955-09-30 00:00:00+09'::timestamptz,
    contract_date = '2026-02-09 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-09 00:00:00+09'::timestamptz
  WHERE member_code = '830113-01';

UPDATE "MlmMember" SET
    birth_date = '1939-02-02 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '830812-01';

UPDATE "MlmMember" SET
    birth_date = '1971-12-10 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '831914-01';

UPDATE "MlmMember" SET
    birth_date = '1952-08-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '832197-01';

UPDATE "MlmMember" SET
    birth_date = '1956-03-22 00:00:00+09'::timestamptz,
    contract_date = '2025-01-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '834339-01';

UPDATE "MlmMember" SET
    birth_date = '1967-10-15 00:00:00+09'::timestamptz,
    contract_date = '2025-05-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '835280-01';

UPDATE "MlmMember" SET
    birth_date = '1967-09-28 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '839542-01';

UPDATE "MlmMember" SET
    birth_date = '1969-11-16 00:00:00+09'::timestamptz,
    contract_date = '2025-06-13 00:00:00+09'::timestamptz,
    first_pay_date = '2025-06-12 00:00:00+09'::timestamptz
  WHERE member_code = '843416-01';

UPDATE "MlmMember" SET
    birth_date = '1955-01-29 00:00:00+09'::timestamptz,
    contract_date = '2026-02-09 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-09 00:00:00+09'::timestamptz
  WHERE member_code = '843472-01';

UPDATE "MlmMember" SET
    birth_date = '1951-03-04 00:00:00+09'::timestamptz,
    contract_date = '2025-02-27 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '843726-01';

UPDATE "MlmMember" SET
    birth_date = '1949-05-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '843735-01';

UPDATE "MlmMember" SET
    birth_date = '1992-11-02 00:00:00+09'::timestamptz,
    contract_date = '2025-12-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '844623-01';

UPDATE "MlmMember" SET
    birth_date = '1972-12-23 00:00:00+09'::timestamptz,
    contract_date = '2025-07-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '845451-01';

UPDATE "MlmMember" SET
    birth_date = '1951-07-14 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '848349-01';

UPDATE "MlmMember" SET
    birth_date = '1951-07-14 00:00:00+09'::timestamptz,
    contract_date = '2025-03-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-22 00:00:00+09'::timestamptz
  WHERE member_code = '848349-02';

UPDATE "MlmMember" SET
    birth_date = '1962-10-02 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '849494-01';

UPDATE "MlmMember" SET
    birth_date = '1964-03-02 00:00:00+09'::timestamptz,
    contract_date = '2025-04-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '851293-01';

UPDATE "MlmMember" SET
    birth_date = '1962-10-04 00:00:00+09'::timestamptz,
    contract_date = '2024-11-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '852848-01';

UPDATE "MlmMember" SET
    birth_date = '1968-02-04 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '854097-01';

UPDATE "MlmMember" SET
    birth_date = '1954-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-10-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '854648-01';

UPDATE "MlmMember" SET
    birth_date = '1961-12-23 00:00:00+09'::timestamptz,
    contract_date = '2024-12-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '855088-01';

UPDATE "MlmMember" SET
    birth_date = '1956-07-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '855091-01';

UPDATE "MlmMember" SET
    birth_date = '1949-08-16 00:00:00+09'::timestamptz,
    contract_date = '2025-07-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-26 00:00:00+09'::timestamptz
  WHERE member_code = '856277-01';

UPDATE "MlmMember" SET
    birth_date = '1945-12-04 00:00:00+09'::timestamptz,
    contract_date = '2025-01-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '857422-01';

UPDATE "MlmMember" SET
    birth_date = '1957-12-18 00:00:00+09'::timestamptz,
    contract_date = '2025-08-25 00:00:00+09'::timestamptz,
    first_pay_date = '2025-08-22 00:00:00+09'::timestamptz
  WHERE member_code = '857915-01';

UPDATE "MlmMember" SET
    birth_date = '1944-02-27 00:00:00+09'::timestamptz,
    contract_date = '2025-02-01 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '860625-01';

UPDATE "MlmMember" SET
    birth_date = '1979-03-03 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '863161-01';

UPDATE "MlmMember" SET
    birth_date = '1961-02-20 00:00:00+09'::timestamptz,
    contract_date = '2026-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '864705-01';

UPDATE "MlmMember" SET
    birth_date = '1952-02-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '864951-01';

UPDATE "MlmMember" SET
    birth_date = '1924-09-10 00:00:00+09'::timestamptz,
    contract_date = '2025-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '867045-01';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-01';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-02';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-03';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-04';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-05';

UPDATE "MlmMember" SET
    birth_date = '1956-02-24 00:00:00+09'::timestamptz,
    contract_date = '2025-01-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '868206-06';

UPDATE "MlmMember" SET
    birth_date = '1988-08-18 00:00:00+09'::timestamptz,
    contract_date = '2024-10-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '875191-01';

UPDATE "MlmMember" SET
    birth_date = '1963-11-17 00:00:00+09'::timestamptz,
    contract_date = '2026-03-03 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-03 00:00:00+09'::timestamptz
  WHERE member_code = '877844-01';

UPDATE "MlmMember" SET
    birth_date = '1967-04-12 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '879965-01';

UPDATE "MlmMember" SET
    birth_date = '1961-03-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '882361-01';

UPDATE "MlmMember" SET
    birth_date = '1961-03-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '882361-02';

UPDATE "MlmMember" SET
    birth_date = '1961-03-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '882361-03';

UPDATE "MlmMember" SET
    birth_date = '1963-12-11 00:00:00+09'::timestamptz,
    contract_date = '2024-12-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '882497-01';

UPDATE "MlmMember" SET
    birth_date = '1959-12-08 00:00:00+09'::timestamptz,
    contract_date = '2026-03-27 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-27 00:00:00+09'::timestamptz
  WHERE member_code = '882955-01';

UPDATE "MlmMember" SET
    birth_date = '1958-02-09 00:00:00+09'::timestamptz,
    contract_date = '2025-04-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '883234-01';

UPDATE "MlmMember" SET
    birth_date = '1962-09-12 00:00:00+09'::timestamptz,
    contract_date = '2025-03-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '883790-01';

UPDATE "MlmMember" SET
    birth_date = '1986-02-28 00:00:00+09'::timestamptz,
    contract_date = '2026-01-29 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-29 00:00:00+09'::timestamptz
  WHERE member_code = '884051-01';

UPDATE "MlmMember" SET
    birth_date = '1969-12-20 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-26 00:00:00+09'::timestamptz
  WHERE member_code = '884946-01';

UPDATE "MlmMember" SET
    birth_date = '1996-12-31 00:00:00+09'::timestamptz,
    contract_date = '2025-11-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-11-19 00:00:00+09'::timestamptz
  WHERE member_code = '886861-01';

UPDATE "MlmMember" SET
    birth_date = '1960-06-08 00:00:00+09'::timestamptz,
    contract_date = '2024-11-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '888985-01';

UPDATE "MlmMember" SET
    birth_date = '1960-06-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-01 00:00:00+09'::timestamptz
  WHERE member_code = '888985-02';

UPDATE "MlmMember" SET
    birth_date = '1955-05-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '889055-01';

UPDATE "MlmMember" SET
    birth_date = '1955-05-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '889055-02';

UPDATE "MlmMember" SET
    birth_date = '1955-05-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '889055-03';

UPDATE "MlmMember" SET
    birth_date = '1983-10-07 00:00:00+09'::timestamptz,
    contract_date = '2026-04-29 00:00:00+09'::timestamptz,
    first_pay_date = '2026-04-29 00:00:00+09'::timestamptz
  WHERE member_code = '890155-01';

UPDATE "MlmMember" SET
    birth_date = '1947-07-21 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '890197-01';

UPDATE "MlmMember" SET
    birth_date = '1944-02-24 00:00:00+09'::timestamptz,
    contract_date = '2024-11-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '891090-01';

UPDATE "MlmMember" SET
    birth_date = '1948-02-06 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '891444-01';

UPDATE "MlmMember" SET
    birth_date = '1948-02-06 00:00:00+09'::timestamptz,
    contract_date = '2024-10-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '891444-02';

UPDATE "MlmMember" SET
    birth_date = '1982-04-14 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = '2025-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '892488-01';

UPDATE "MlmMember" SET
    birth_date = '1976-07-11 00:00:00+09'::timestamptz,
    contract_date = '2026-02-17 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-17 00:00:00+09'::timestamptz
  WHERE member_code = '892808-01';

UPDATE "MlmMember" SET
    birth_date = '1958-04-04 00:00:00+09'::timestamptz,
    contract_date = '2025-05-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-28 00:00:00+09'::timestamptz
  WHERE member_code = '894185-01';

UPDATE "MlmMember" SET
    birth_date = '1990-08-09 00:00:00+09'::timestamptz,
    contract_date = '2024-12-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '894590-01';

UPDATE "MlmMember" SET
    birth_date = '1964-08-04 00:00:00+09'::timestamptz,
    contract_date = '2025-03-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '894919-01';

UPDATE "MlmMember" SET
    birth_date = '1960-01-02 00:00:00+09'::timestamptz,
    contract_date = '2024-10-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '897179-01';

UPDATE "MlmMember" SET
    birth_date = '1961-08-07 00:00:00+09'::timestamptz,
    contract_date = '2024-12-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '898375-01';

UPDATE "MlmMember" SET
    birth_date = '1945-01-31 00:00:00+09'::timestamptz,
    contract_date = '2025-08-12 00:00:00+09'::timestamptz,
    first_pay_date = '2025-08-12 00:00:00+09'::timestamptz
  WHERE member_code = '900158-01';

UPDATE "MlmMember" SET
    birth_date = '1962-12-21 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-28 00:00:00+09'::timestamptz
  WHERE member_code = '900587-01';

UPDATE "MlmMember" SET
    birth_date = '1956-11-15 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '901268-01';

UPDATE "MlmMember" SET
    birth_date = '1981-07-13 00:00:00+09'::timestamptz,
    contract_date = '2025-07-21 00:00:00+09'::timestamptz,
    first_pay_date = '2025-07-20 00:00:00+09'::timestamptz
  WHERE member_code = '903278-01';

UPDATE "MlmMember" SET
    birth_date = '1987-03-10 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '906399-01';

UPDATE "MlmMember" SET
    birth_date = '1949-02-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '906717-01';

UPDATE "MlmMember" SET
    birth_date = '1953-05-10 00:00:00+09'::timestamptz,
    contract_date = '2024-12-18 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '908227-01';

UPDATE "MlmMember" SET
    birth_date = '1920-01-13 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '908423-01';

UPDATE "MlmMember" SET
    birth_date = '1953-01-03 00:00:00+09'::timestamptz,
    contract_date = '2025-02-21 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '908597-01';

UPDATE "MlmMember" SET
    birth_date = '1992-07-17 00:00:00+09'::timestamptz,
    contract_date = '2026-02-13 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-13 00:00:00+09'::timestamptz
  WHERE member_code = '910334-01';

UPDATE "MlmMember" SET
    birth_date = '1991-04-30 00:00:00+09'::timestamptz,
    contract_date = '2025-01-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '911110-01';

UPDATE "MlmMember" SET
    birth_date = '1981-01-14 00:00:00+09'::timestamptz,
    contract_date = '2024-12-15 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '911118-01';

UPDATE "MlmMember" SET
    birth_date = '1957-09-11 00:00:00+09'::timestamptz,
    contract_date = '2024-12-12 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '912569-01';

UPDATE "MlmMember" SET
    birth_date = '1970-03-16 00:00:00+09'::timestamptz,
    contract_date = '2024-12-16 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '913375-01';

UPDATE "MlmMember" SET
    birth_date = '1949-09-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-21 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '915203-01';

UPDATE "MlmMember" SET
    birth_date = '1950-01-07 00:00:00+09'::timestamptz,
    contract_date = '2024-10-20 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '916546-01';

UPDATE "MlmMember" SET
    birth_date = NULL,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '916771-01';

UPDATE "MlmMember" SET
    birth_date = '1965-08-21 00:00:00+09'::timestamptz,
    contract_date = '2024-11-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '917139-01';

UPDATE "MlmMember" SET
    birth_date = '1956-09-08 00:00:00+09'::timestamptz,
    contract_date = '2025-01-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '917301-01';

UPDATE "MlmMember" SET
    birth_date = '1967-02-04 00:00:00+09'::timestamptz,
    contract_date = '2025-02-22 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-20 00:00:00+09'::timestamptz
  WHERE member_code = '917429-01';

UPDATE "MlmMember" SET
    birth_date = '1961-05-10 00:00:00+09'::timestamptz,
    contract_date = '2025-02-23 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '918271-01';

UPDATE "MlmMember" SET
    birth_date = '1986-04-18 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '918649-01';

UPDATE "MlmMember" SET
    birth_date = '1983-03-30 00:00:00+09'::timestamptz,
    contract_date = '2025-04-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '919194-01';

UPDATE "MlmMember" SET
    birth_date = '1964-09-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-28 00:00:00+09'::timestamptz
  WHERE member_code = '919803-01';

UPDATE "MlmMember" SET
    birth_date = '1953-07-23 00:00:00+09'::timestamptz,
    contract_date = '2024-09-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '926466-01';

UPDATE "MlmMember" SET
    birth_date = '1953-07-23 00:00:00+09'::timestamptz,
    contract_date = '2024-09-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '926466-02';

UPDATE "MlmMember" SET
    birth_date = '1953-07-23 00:00:00+09'::timestamptz,
    contract_date = '2024-09-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '926466-03';

UPDATE "MlmMember" SET
    birth_date = '1988-04-21 00:00:00+09'::timestamptz,
    contract_date = '2024-12-22 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '927033-01';

UPDATE "MlmMember" SET
    birth_date = '1944-07-30 00:00:00+09'::timestamptz,
    contract_date = '2025-01-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '927304-01';

UPDATE "MlmMember" SET
    birth_date = '1967-04-07 00:00:00+09'::timestamptz,
    contract_date = '2025-04-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '928636-01';

UPDATE "MlmMember" SET
    birth_date = '1967-04-07 00:00:00+09'::timestamptz,
    contract_date = '2025-04-10 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '928636-02';

UPDATE "MlmMember" SET
    birth_date = '1973-06-18 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '929932-01';

UPDATE "MlmMember" SET
    birth_date = '1991-02-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-24 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '930178-01';

UPDATE "MlmMember" SET
    birth_date = '1991-03-11 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-31 00:00:00+09'::timestamptz
  WHERE member_code = '931590-01';

UPDATE "MlmMember" SET
    birth_date = '1963-04-01 00:00:00+09'::timestamptz,
    contract_date = '2026-01-28 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-28 00:00:00+09'::timestamptz
  WHERE member_code = '933955-01';

UPDATE "MlmMember" SET
    birth_date = '1958-10-29 00:00:00+09'::timestamptz,
    contract_date = '2024-10-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '934888-01';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-01';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-02';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2024-10-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-03';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-04';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-05';

UPDATE "MlmMember" SET
    birth_date = '1958-07-15 00:00:00+09'::timestamptz,
    contract_date = '2025-01-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '937136-06';

UPDATE "MlmMember" SET
    birth_date = '1970-11-30 00:00:00+09'::timestamptz,
    contract_date = '2026-02-14 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-14 00:00:00+09'::timestamptz
  WHERE member_code = '937445-01';

UPDATE "MlmMember" SET
    birth_date = '1954-02-27 00:00:00+09'::timestamptz,
    contract_date = '2024-12-06 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '938307-01';

UPDATE "MlmMember" SET
    birth_date = '1943-08-11 00:00:00+09'::timestamptz,
    contract_date = '2025-01-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '942734-01';

UPDATE "MlmMember" SET
    birth_date = '1950-01-03 00:00:00+09'::timestamptz,
    contract_date = '2026-03-03 00:00:00+09'::timestamptz,
    first_pay_date = '2026-03-03 00:00:00+09'::timestamptz
  WHERE member_code = '944821-01';

UPDATE "MlmMember" SET
    birth_date = '1951-09-06 00:00:00+09'::timestamptz,
    contract_date = '2024-12-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '945643-01';

UPDATE "MlmMember" SET
    birth_date = '1975-04-21 00:00:00+09'::timestamptz,
    contract_date = '2024-10-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '947126-01';

UPDATE "MlmMember" SET
    birth_date = '1956-09-12 00:00:00+09'::timestamptz,
    contract_date = '2026-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2026-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '949540-01';

UPDATE "MlmMember" SET
    birth_date = '1947-01-13 00:00:00+09'::timestamptz,
    contract_date = '2025-03-30 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-30 00:00:00+09'::timestamptz
  WHERE member_code = '950633-01';

UPDATE "MlmMember" SET
    birth_date = '1984-05-12 00:00:00+09'::timestamptz,
    contract_date = '2024-09-09 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '954468-01';

UPDATE "MlmMember" SET
    birth_date = '1960-04-02 00:00:00+09'::timestamptz,
    contract_date = '2025-02-15 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '954782-01';

UPDATE "MlmMember" SET
    birth_date = '1974-01-23 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '955794-01';

UPDATE "MlmMember" SET
    birth_date = '1952-02-28 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '956525-01';

UPDATE "MlmMember" SET
    birth_date = '1965-08-11 00:00:00+09'::timestamptz,
    contract_date = '2026-01-31 00:00:00+09'::timestamptz,
    first_pay_date = '2026-01-31 00:00:00+09'::timestamptz
  WHERE member_code = '957092-01';

UPDATE "MlmMember" SET
    birth_date = '1961-11-09 00:00:00+09'::timestamptz,
    contract_date = '2025-05-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '958545-01';

UPDATE "MlmMember" SET
    birth_date = '1959-12-30 00:00:00+09'::timestamptz,
    contract_date = '2025-03-29 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-28 00:00:00+09'::timestamptz
  WHERE member_code = '961831-01';

UPDATE "MlmMember" SET
    birth_date = '1959-08-08 00:00:00+09'::timestamptz,
    contract_date = '2025-10-23 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '963019-01';

UPDATE "MlmMember" SET
    birth_date = '1974-11-29 00:00:00+09'::timestamptz,
    contract_date = '2025-09-04 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '963689-01';

UPDATE "MlmMember" SET
    birth_date = '1961-04-05 00:00:00+09'::timestamptz,
    contract_date = '2025-02-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '964475-01';

UPDATE "MlmMember" SET
    birth_date = '1957-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '965604-01';

UPDATE "MlmMember" SET
    birth_date = '1957-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '965604-02';

UPDATE "MlmMember" SET
    birth_date = '1970-10-01 00:00:00+09'::timestamptz,
    contract_date = '2025-10-14 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '965670-01';

UPDATE "MlmMember" SET
    birth_date = '1951-10-13 00:00:00+09'::timestamptz,
    contract_date = '2025-01-27 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '965981-01';

UPDATE "MlmMember" SET
    birth_date = '1951-04-17 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '966495-01';

UPDATE "MlmMember" SET
    birth_date = '1951-04-17 00:00:00+09'::timestamptz,
    contract_date = '2024-11-19 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '966495-02';

UPDATE "MlmMember" SET
    birth_date = '1960-07-28 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-27 00:00:00+09'::timestamptz
  WHERE member_code = '969139-01';

UPDATE "MlmMember" SET
    birth_date = '1952-04-23 00:00:00+09'::timestamptz,
    contract_date = '2024-12-13 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '969730-01';

UPDATE "MlmMember" SET
    birth_date = '1952-04-23 00:00:00+09'::timestamptz,
    contract_date = '2025-03-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-03-21 00:00:00+09'::timestamptz
  WHERE member_code = '969730-02';

UPDATE "MlmMember" SET
    birth_date = '1963-01-25 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '971315-01';

UPDATE "MlmMember" SET
    birth_date = '1988-06-21 00:00:00+09'::timestamptz,
    contract_date = '2025-01-05 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '976347-01';

UPDATE "MlmMember" SET
    birth_date = '1994-01-04 00:00:00+09'::timestamptz,
    contract_date = '2024-12-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '976761-01';

UPDATE "MlmMember" SET
    birth_date = '1975-04-15 00:00:00+09'::timestamptz,
    contract_date = '2025-10-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '978606-01';

UPDATE "MlmMember" SET
    birth_date = '1952-11-18 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '981718-01';

UPDATE "MlmMember" SET
    birth_date = '1963-03-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '982542-01';

UPDATE "MlmMember" SET
    birth_date = '1963-03-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '982542-02';

UPDATE "MlmMember" SET
    birth_date = '1963-03-15 00:00:00+09'::timestamptz,
    contract_date = '2025-02-28 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '982542-03';

UPDATE "MlmMember" SET
    birth_date = '1957-10-16 00:00:00+09'::timestamptz,
    contract_date = '2024-11-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '982740-01';

UPDATE "MlmMember" SET
    birth_date = '1963-08-30 00:00:00+09'::timestamptz,
    contract_date = '2024-12-25 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '983152-01';

UPDATE "MlmMember" SET
    birth_date = '1946-04-30 00:00:00+09'::timestamptz,
    contract_date = '2025-02-25 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-25 00:00:00+09'::timestamptz
  WHERE member_code = '985839-01';

UPDATE "MlmMember" SET
    birth_date = '1962-07-26 00:00:00+09'::timestamptz,
    contract_date = '2025-05-07 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '987703-01';

UPDATE "MlmMember" SET
    birth_date = '1932-08-24 00:00:00+09'::timestamptz,
    contract_date = '2024-12-08 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '989726-01';

UPDATE "MlmMember" SET
    birth_date = '1949-04-14 00:00:00+09'::timestamptz,
    contract_date = '2025-09-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '991801-01';

UPDATE "MlmMember" SET
    birth_date = '1980-10-03 00:00:00+09'::timestamptz,
    contract_date = '2025-02-19 00:00:00+09'::timestamptz,
    first_pay_date = '2025-02-28 00:00:00+09'::timestamptz
  WHERE member_code = '993738-01';

UPDATE "MlmMember" SET
    birth_date = '1986-11-20 00:00:00+09'::timestamptz,
    contract_date = '2025-04-14 00:00:00+09'::timestamptz,
    first_pay_date = '2025-04-15 00:00:00+09'::timestamptz
  WHERE member_code = '993845-01';

UPDATE "MlmMember" SET
    birth_date = '1962-08-19 00:00:00+09'::timestamptz,
    contract_date = '2025-05-31 00:00:00+09'::timestamptz,
    first_pay_date = '2025-05-31 00:00:00+09'::timestamptz
  WHERE member_code = '995167-01';

UPDATE "MlmMember" SET
    birth_date = '1961-01-30 00:00:00+09'::timestamptz,
    contract_date = '2025-09-17 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '997245-01';

UPDATE "MlmMember" SET
    birth_date = '1966-02-10 00:00:00+09'::timestamptz,
    contract_date = '2025-02-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '998382-01';

UPDATE "MlmMember" SET
    birth_date = '1957-03-08 00:00:00+09'::timestamptz,
    contract_date = '2025-06-30 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '999221-01';

UPDATE "MlmMember" SET
    birth_date = '1978-01-24 00:00:00+09'::timestamptz,
    contract_date = '2025-06-29 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '999539-01';

UPDATE "MlmMember" SET
    birth_date = '1943-12-03 00:00:00+09'::timestamptz,
    contract_date = '2024-11-26 00:00:00+09'::timestamptz,
    first_pay_date = NULL
  WHERE member_code = '999946-01';

COMMIT;

-- 合計 796 件の UPDATE を実行