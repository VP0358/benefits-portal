export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const TOKEN = "BulkRegister2026-Viola56"

// CSVから抽出した56名のデータ（購入月付き）
const MEMBERS_DATA = [
  { id: "10234001", name: "荒木　真梨",    kana: "アラキ　マリ",      gender: "female", birth: "1962/6/12",  contractDate: "2026/2/25",  firstPayDate: "2026/2/25",  phone: "090-4325-9022", postal: "4490234", pref: "愛知県", addr: "東海市加木屋町大坪37-6",        building: "",                   referrerId: "93713603", uplineId: "93713603", disclosureDocNo: "120982486", purchaseMonth: "2026-02" },
  { id: "10486501", name: "島内　桃代",    kana: "シマウチ　モモヨ",   gender: "female", birth: "1966/10/25", contractDate: "2026/3/31",  firstPayDate: "2026/3/31",  phone: "090-4910-7901", postal: "6700942", pref: "兵庫県", addr: "姫路市増位新町3-11",           building: "",                   referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "119487216", purchaseMonth: "2026-03" },
  { id: "10580001", name: "國見　昌代",    kana: "クニミ　マサヨ",    gender: "female", birth: "1965/3/31",  contractDate: "2026/3/31",  firstPayDate: "2026/3/31",  phone: "090-6886-0070", postal: "5890022", pref: "大阪府", addr: "大阪市東淀川区大桐2-6-7",      building: "K2大桐103",          referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "119544335", purchaseMonth: "2026-03" },
  { id: "10905501", name: "長谷川　浩一",  kana: "ハセガワ　コウイチ", gender: "male",   birth: "1949/5/1",   contractDate: "2026/2/25",  firstPayDate: "2026/2/19",  phone: "076-668-3555", postal: "9290241", pref: "石川県", addr: "河北郡内灘町ハマナス5-88",     building: "",                   referrerId: "47356803", uplineId: "47356803", disclosureDocNo: "120851272", purchaseMonth: "2026-02" },
  { id: "11003401", name: "上野　愛子",    kana: "ウエノ　アイコ",    gender: "female", birth: "1951/9/17",  contractDate: "2026/3/31",  firstPayDate: "2026/3/31",  phone: "090-3361-7152", postal: "5890022", pref: "大阪府", addr: "大阪市東淀川区大桐4-12-13",   building: "ロジュマン東淀川305", referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "119666778", purchaseMonth: "2026-03" },
  { id: "13706101", name: "宇於崎 とも子", kana: "ウオザキ　トモコ",  gender: "female", birth: "1952/6/17",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "080-5498-9099", postal: "6220041", pref: "京都府", addr: "宇治市槇島町北内田136-2",     building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115660671", purchaseMonth: "2026-01" },
  { id: "14372601", name: "末永 あい子",   kana: "スエナガ　アイコ",  gender: "female", birth: "1959/3/7",   contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-5876-5207", postal: "3220073", pref: "栃木県", addr: "鹿沼市朝日町1516-21",          building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115666220", purchaseMonth: "2026-01" },
  { id: "17384601", name: "茂木 弥生",     kana: "モギ　ヤヨイ",     gender: "female", birth: "1961/3/10",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-5430-1963", postal: "3221144", pref: "栃木県", addr: "鹿沼市上石川512-22",           building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "118037706", purchaseMonth: "2026-02" },
  { id: "21177601", name: "村上　美穂子",  kana: "ムラカミ　ミホコ",  gender: "female", birth: "1967/6/20",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-6487-2753", postal: "6510011", pref: "兵庫県", addr: "神戸市北区山田町下谷上中一色12-1", building: "",                referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "117720499", purchaseMonth: "2026-02" },
  { id: "21497001", name: "川西　智惠子",  kana: "カワニシ　チエコ",  gender: "female", birth: "1963/4/9",   contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-5649-7869", postal: "6500012", pref: "兵庫県", addr: "神戸市中央区北長狭通2-1-18",  building: "ベルデ元町507",      referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "117710698", purchaseMonth: "2026-02" },
  { id: "21813601", name: "宮本 薫",       kana: "ミヤモト　カオル",  gender: "female", birth: "1966/7/26",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-6489-2527", postal: "6510072", pref: "兵庫県", addr: "神戸市北区山田町小部大カラ山42-57", building: "",             referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "115841706", purchaseMonth: "2026-01" },
  { id: "24237301", name: "布施　佳子",    kana: "フセ　ヨシコ",     gender: "female", birth: "1963/5/25",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-4329-6600", postal: "4490234", pref: "愛知県", addr: "東海市加木屋町大坪38-4",        building: "",                   referrerId: "93713603", uplineId: "93713603", disclosureDocNo: "120972773", purchaseMonth: "2026-03" },
  { id: "26570201", name: "須合　恵美子",  kana: "スゴウ　エミコ",   gender: "female", birth: "1963/7/14",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0859-22-8481", postal: "6830845", pref: "鳥取県", addr: "米子市米原3-9-26",             building: "",                   referrerId: "47356803", uplineId: "47356803", disclosureDocNo: "121073673", purchaseMonth: "2026-03" },
  { id: "26582001", name: "熊谷　祐代",    kana: "クマガイ　サチヨ",  gender: "female", birth: "1972/7/25",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-3743-6023", postal: "0130207", pref: "秋田県", addr: "横手市平鹿町醍醐字野口107",   building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "121044540", purchaseMonth: "2026-03" },
  { id: "27067501", name: "平田　紗耶",    kana: "ヒラタ　サヤ",     gender: "female", birth: "1994/1/30",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-8509-4978", postal: "7700865", pref: "徳島県", addr: "徳島市南二軒屋町2-5-32",      building: "エスぺランサ206",     referrerId: "47356803", uplineId: "47356803", disclosureDocNo: "117884451", purchaseMonth: "2026-02" },
  { id: "28860601", name: "平野　浩子",    kana: "ヒラノ　ヒロコ",   gender: "female", birth: "1963/12/7",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-4328-2100", postal: "6510072", pref: "兵庫県", addr: "神戸市北区山田町小部字モミジ17-76", building: "",             referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "121057009", purchaseMonth: "2026-03" },
  { id: "28864601", name: "矢崎　加依",    kana: "ヤザキ　カイ",     gender: "female", birth: "1991/7/28",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-4207-8672", postal: "3300073", pref: "埼玉県", addr: "さいたま市浦和区元町1-26-15", building: "ライオンズ浦和仲町401", referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117958754", purchaseMonth: "2026-02" },
  { id: "33912901", name: "福島　美智代",  kana: "フクシマ　ミチヨ",  gender: "female", birth: "1963/5/30",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-1232-3434", postal: "5200851", pref: "滋賀県", addr: "大津市唐崎3-2-7",             building: "",                   referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "118063765", purchaseMonth: "2026-02" },
  { id: "34185001", name: "堀田　紀子",    kana: "ホッタ　ノリコ",   gender: "female", birth: "1961/3/3",   contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-5031-0218", postal: "4510072", pref: "愛知県", addr: "西尾市戸ケ崎町南田面36",       building: "",                   referrerId: "93713603", uplineId: "93713603", disclosureDocNo: "117706218", purchaseMonth: "2026-02" },
  { id: "35884501", name: "日色　明美",    kana: "ヒイロ　アケミ",   gender: "female", birth: "1963/11/16", contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-4327-4918", postal: "4490234", pref: "愛知県", addr: "東海市加木屋町流光寺1",         building: "",                   referrerId: "93713603", uplineId: "93713603", disclosureDocNo: "120836491", purchaseMonth: "2026-03" },
  { id: "37264901", name: "白崎 恵美子",   kana: "シラサキ　エミコ",  gender: "female", birth: "1963/1/13",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-3087-9499", postal: "0600004", pref: "北海道", addr: "札幌市中央区北四条西25丁目4-13", building: "シングルスペース209", referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117700613", purchaseMonth: "2026-02" },
  { id: "37779601", name: "金場　弘枝",    kana: "カネバ　ヒロエ",   gender: "female", birth: "1955/1/16",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "0776-52-3738", postal: "9100805", pref: "福井県", addr: "福井市半田1-1001",             building: "",                   referrerId: "47356803", uplineId: "47356803", disclosureDocNo: "117853524", purchaseMonth: "2026-02" },
  { id: "40220601", name: "中山　幾代",    kana: "ナカヤマ　イクヨ",  gender: "female", birth: "1953/2/26",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0776-52-6665", postal: "9100805", pref: "福井県", addr: "福井市半田1-1403",             building: "",                   referrerId: "47356803", uplineId: "47356803", disclosureDocNo: "120836503", purchaseMonth: "2026-03" },
  { id: "41102101", name: "山下　眞知子",  kana: "ヤマシタ　マチコ",  gender: "female", birth: "1959/5/14",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-3611-8186", postal: "5870033", pref: "大阪府", addr: "堺市南区原山台2-1-7",          building: "",                   referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "118043454", purchaseMonth: "2026-02" },
  { id: "42011501", name: "東田　恵美子",  kana: "ヒガシダ　エミコ",  gender: "female", birth: "1962/9/12",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-8534-8285", postal: "5890011", pref: "大阪府", addr: "大阪市東淀川区大隅2-8-28",    building: "コーポ東淀川305",    referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "121082779", purchaseMonth: "2026-03" },
  { id: "42455601", name: "菊池　敏子",    kana: "キクチ　トシコ",   gender: "female", birth: "1959/2/15",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "0191-23-4380", postal: "0230831", pref: "岩手県", addr: "奥州市水沢区常盤町1-20",       building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "118035614", purchaseMonth: "2026-02" },
  { id: "43276701", name: "井上　美和",    kana: "イノウエ　ミワ",   gender: "female", birth: "1969/3/14",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "080-4226-9199", postal: "6700054", pref: "兵庫県", addr: "姫路市西延末7-4",             building: "ブランシュール姫路302", referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "115859891", purchaseMonth: "2026-01" },
  { id: "43389401", name: "和田 素美",     kana: "ワダ　モトミ",     gender: "female", birth: "1963/4/4",   contractDate: "2025/11/30", firstPayDate: "2025/11/30", phone: "090-7043-0018", postal: "3270827", pref: "栃木県", addr: "佐野市黒袴町897-3",            building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "114485847", purchaseMonth: "2025-12" },
  { id: "47379101", name: "河合 千寿子",   kana: "カワイ　チズコ",   gender: "female", birth: "1960/12/11", contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-5870-7447", postal: "3210912", pref: "栃木県", addr: "宇都宮市西刑部町1183",          building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115670783", purchaseMonth: "2026-01" },
  { id: "47496501", name: "小池　イク子",  kana: "コイケ　イクコ",   gender: "female", birth: "1951/5/5",   contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0191-23-5100", postal: "0230831", pref: "岩手県", addr: "奥州市水沢区常盤町3-41",       building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "120888680", purchaseMonth: "2026-03" },
  { id: "48895701", name: "平塚 由香",     kana: "ヒラツカ　ユカ",   gender: "female", birth: "1976/6/30",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "070-4450-3843", postal: "3270024", pref: "栃木県", addr: "佐野市桐生町208-1",            building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117946572", purchaseMonth: "2026-02" },
  { id: "53771801", name: "佐藤　優子",    kana: "サトウ　ユウコ",   gender: "female", birth: "1964/1/1",   contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0191-23-7560", postal: "0230831", pref: "岩手県", addr: "奥州市水沢区常盤町1-48",       building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "120964898", purchaseMonth: "2026-03" },
  { id: "59901301", name: "佐藤　すみ子",  kana: "サトウ　スミコ",   gender: "female", birth: "1955/4/18",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0193-62-3030", postal: "0280082", pref: "岩手県", addr: "久慈市下長内町11-17-7",        building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "120902474", purchaseMonth: "2026-03" },
  { id: "60649301", name: "金子 恭子",     kana: "カネコ　キョウコ",  gender: "female", birth: "1955/11/29", contractDate: "2025/11/30", firstPayDate: "2025/11/30", phone: "090-2978-4175", postal: "3210912", pref: "栃木県", addr: "宇都宮市西刑部町1191-8",        building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "114491295", purchaseMonth: "2025-12" },
  { id: "60962201", name: "片山 真弓",     kana: "カタヤマ　マユミ",  gender: "female", birth: "1964/5/11",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-2781-9688", postal: "0250014", pref: "秋田県", addr: "能代市日吉町3-17",             building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117696278", purchaseMonth: "2026-02" },
  { id: "61632601", name: "新井　昌子",    kana: "アライ　マサコ",   gender: "female", birth: "1960/4/6",   contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "048-799-3834", postal: "3460038", pref: "埼玉県", addr: "久喜市江面1564-3",             building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "118034628", purchaseMonth: "2026-02" },
  { id: "64432701", name: "大塚 祥子",     kana: "オオツカ　ヨシコ",  gender: "female", birth: "1960/4/16",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-2558-5020", postal: "3210912", pref: "栃木県", addr: "宇都宮市西刑部町1192",          building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115663774", purchaseMonth: "2026-01" },
  { id: "66383701", name: "村岸 美鶴帆",   kana: "ムラキシ　ミズホ",  gender: "female", birth: "1975/7/5",   contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-3126-6027", postal: "3210912", pref: "栃木県", addr: "宇都宮市西刑部町1185-6",        building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115663796", purchaseMonth: "2026-01" },
  { id: "66797501", name: "竹内　達也",    kana: "タケウチ　タツヤ",  gender: "male",   birth: "1975/8/26",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-5159-4975", postal: "5620004", pref: "大阪府", addr: "大阪府箕面市牧落3-9-7",        building: "",                   referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "117724428", purchaseMonth: "2026-02" },
  { id: "68429001", name: "島田　龍太郎",  kana: "シマダ　リュウタロウ", gender: "male", birth: "1991/2/14", contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-4339-0218", postal: "6514104", pref: "兵庫県", addr: "神戸市西区押部谷町細田113-4",  building: "",                   referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "117707148", purchaseMonth: "2026-02" },
  { id: "77478101", name: "岩崎　愛",      kana: "イワサキ　アイ",   gender: "female", birth: "1986/11/22", contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-3527-7215", postal: "5890022", pref: "大阪府", addr: "大阪市東淀川区大桐4-8-18",    building: "グランティア東淀川305", referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "117722497", purchaseMonth: "2026-02" },
  { id: "82212401", name: "中　三千代",    kana: "ナカ　ミチヨ",     gender: "female", birth: "1960/2/29",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-6260-6534", postal: "5870051", pref: "大阪府", addr: "堺市南区晴美台1-8-10",         building: "",                   referrerId: "42845502", uplineId: "42845502", disclosureDocNo: "120874497", purchaseMonth: "2026-03" },
  { id: "83011301", name: "白川 洋子",     kana: "シラカワ　ヨウコ",  gender: "female", birth: "1958/11/8",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "022-222-1505", postal: "9800802", pref: "宮城県", addr: "仙台市青葉区二日町14-28",      building: "二日町マンション301", referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117961060", purchaseMonth: "2026-02" },
  { id: "84347201", name: "西田 紀代美",   kana: "ニシダ　キヨミ",   gender: "female", birth: "1963/2/18",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-5870-1688", postal: "3200843", pref: "栃木県", addr: "宇都宮市花園町5-9",            building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117951543", purchaseMonth: "2026-02" },
  { id: "84462301", name: "奥寺 美里",     kana: "オクテラ　ミサト",  gender: "female", birth: "1977/3/4",   contractDate: "2025/11/30", firstPayDate: "2025/11/30", phone: "090-7538-3003", postal: "0231121", pref: "岩手県", addr: "奥州市前沢区下川原3-3",        building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "114491195", purchaseMonth: "2025-12" },
  { id: "86470501", name: "阿部 暢子",     kana: "アベ　ノブコ",     gender: "female", birth: "1961/9/27",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-3645-3660", postal: "0230831", pref: "岩手県", addr: "奥州市水沢区常盤町3-28",       building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115677889", purchaseMonth: "2026-01" },
  { id: "87784401", name: "鈴木　令子",    kana: "スズキ　レイコ",   gender: "female", birth: "1964/4/5",   contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-3406-1680", postal: "4490234", pref: "愛知県", addr: "東海市加木屋町流光寺10",        building: "",                   referrerId: "93713603", uplineId: "93713603", disclosureDocNo: "120854483", purchaseMonth: "2026-03" },
  { id: "88295501", name: "佐藤　良子",    kana: "サトウ　ヨシコ",   gender: "female", birth: "1964/11/20", contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "0191-25-2218", postal: "0230016", pref: "岩手県", addr: "奥州市水沢区吉小路23-1",       building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "120896277", purchaseMonth: "2026-03" },
  { id: "88405101", name: "下山　絢子",    kana: "シモヤマ　アヤコ",  gender: "female", birth: "1981/7/18",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-3749-5019", postal: "0110901", pref: "北海道", addr: "上川郡鷹栖町7線10号15",        building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115676868", purchaseMonth: "2026-01" },
  { id: "89280801", name: "梶原　みゆき",  kana: "カジワラ　ミユキ",  gender: "female", birth: "1969/7/13",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "090-3746-6396", postal: "0260061", pref: "秋田県", addr: "由利本荘市石脇字石脇190-6",   building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117946619", purchaseMonth: "2026-02" },
  { id: "91033401", name: "川上　翼",      kana: "カワカミ　ツバサ",  gender: "male",   birth: "1995/1/15",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "080-5481-2090", postal: "6510073", pref: "兵庫県", addr: "神戸市北区山田町小部北ノ上9-35", building: "",                referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "118045497", purchaseMonth: "2026-02" },
  { id: "93395501", name: "宮本 嘉也",     kana: "ミヤモト　ヨシヤ",  gender: "male",   birth: "1964/11/15", contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-6489-0985", postal: "6510072", pref: "兵庫県", addr: "神戸市北区山田町小部大カラ山42-41", building: "",             referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "115841700", purchaseMonth: "2026-01" },
  { id: "93744501", name: "柴田 久美子",   kana: "シバタ　クミコ",   gender: "female", birth: "1967/12/14", contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "0193-63-2118", postal: "0280021", pref: "岩手県", addr: "久慈市川崎町3-29",             building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117944564", purchaseMonth: "2026-02" },
  { id: "94482101", name: "田代　芳江",    kana: "タシロ　ヨシエ",   gender: "female", birth: "1967/4/16",  contractDate: "2026/2/28",  firstPayDate: "2026/2/28",  phone: "090-4910-8688", postal: "6700942", pref: "兵庫県", addr: "姫路市増位新町3-28-4",         building: "",                   referrerId: "28860601", uplineId: "28860601", disclosureDocNo: "121063684", purchaseMonth: "2026-03" },
  { id: "94954001", name: "千葉　きみ子",  kana: "チバ　キミコ",     gender: "female", birth: "1955/9/20",  contractDate: "2026/1/31",  firstPayDate: "2026/1/31",  phone: "0193-62-2217", postal: "0280082", pref: "岩手県", addr: "久慈市下長内町11-49",          building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "117950527", purchaseMonth: "2026-02" },
  { id: "95709201", name: "谷澤 美奈子",   kana: "タニザワ　ミナコ",  gender: "female", birth: "1973/8/25",  contractDate: "2025/12/31", firstPayDate: "2025/12/31", phone: "090-5169-8685", postal: "3240052", pref: "栃木県", addr: "栃木市大宮町2235-39",           building: "",                   referrerId: "86820603", uplineId: "86820603", disclosureDocNo: "115668200", purchaseMonth: "2026-01" },
]

const PRODUCT_CODE = "1000"
const PRODUCT_NAME = "[新規]VIOLA Pure 翠彩-SUMISAI-"
const UNIT_PRICE = 15000
const POINTS = 150

function parseDateJST(dateStr: string): Date | null {
  if (!dateStr) return null
  const m = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  // JSTの日付として0:00のUTC相当を返す
  return new Date(`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}T00:00:00+09:00`)
}

function memberCodeFromId(rawId: string): string {
  if (rawId.length >= 3) return rawId.slice(0, -2) + '-' + rawId.slice(-2)
  return rawId
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const mode = searchParams.get("mode") || "check"

  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ---- CHECK モード ----
  if (mode === "check") {
    const results = []
    for (const m of MEMBERS_DATA) {
      const mc = memberCodeFromId(m.id)
      const user = await prisma.user.findUnique({ where: { memberCode: mc } })
      const mlm = await prisma.mlmMember.findUnique({ where: { memberCode: mc } })
      results.push({
        memberCode: mc,
        name: m.name,
        purchaseMonth: m.purchaseMonth,
        hasUser: !!user,
        hasMlm: !!mlm,
        status: user ? (mlm ? "READY" : "USER_ONLY") : "MISSING",
      })
    }
    const summary = {
      total: results.length,
      ready: results.filter(r => r.status === "READY").length,
      userOnly: results.filter(r => r.status === "USER_ONLY").length,
      missing: results.filter(r => r.status === "MISSING").length,
    }
    return NextResponse.json({ mode: "check", summary, results })
  }

  // ---- REGISTER モード: User + MlmMember + MlmRegistration を作成 ----
  if (mode === "register") {
    const created = []
    const skipped = []
    const errors = []
    const passwordHash = await bcrypt.hash("Viola2026!", 10)

    for (const m of MEMBERS_DATA) {
      const mc = memberCodeFromId(m.id)
      try {
        // 既存チェック
        const existingUser = await prisma.user.findUnique({ where: { memberCode: mc } })
        if (existingUser) {
          skipped.push({ memberCode: mc, name: m.name, reason: "既にUser存在" })
          continue
        }

        // メールアドレス生成（なければダミー）
        const email = `member-${m.id}@noemail.viola-pure.net`

        // 住所結合
        const address = [m.pref, m.addr, m.building].filter(Boolean).join(' ')
        const postalCode = m.postal.replace(/^(\d{3})(\d{4})$/, '$1-$2')

        // 紹介者・直上者のMlmMember IDを取得
        let uplineDbId: bigint | null = null
        let referrerDbId: bigint | null = null

        if (m.uplineId) {
          const uplineMc = memberCodeFromId(m.uplineId)
          const uplineMlm = await prisma.mlmMember.findUnique({ where: { memberCode: uplineMc } })
          if (uplineMlm) uplineDbId = uplineMlm.id
        }
        if (m.referrerId && m.referrerId !== m.uplineId) {
          const refMc = memberCodeFromId(m.referrerId)
          const refMlm = await prisma.mlmMember.findUnique({ where: { memberCode: refMc } })
          if (refMlm) referrerDbId = refMlm.id
        } else if (m.referrerId === m.uplineId) {
          referrerDbId = uplineDbId
        }

        const contractDate = parseDateJST(m.contractDate)
        const firstPayDate = parseDateJST(m.firstPayDate)
        const birthDate = m.birth ? parseDateJST(m.birth) : null

        // User作成
        const newUser = await prisma.user.create({
          data: {
            memberCode: mc,
            name: m.name,
            nameKana: m.kana,
            email,
            passwordHash,
            phone: m.phone || null,
            postalCode,
            address,
            status: "active",
          },
        })

        // PointWallet作成
        await prisma.pointWallet.create({
          data: { userId: newUser.id, points: 0 }
        })

        // MlmMember作成
        const newMlm = await prisma.mlmMember.create({
          data: {
            userId: newUser.id,
            memberCode: mc,
            memberType: "business",
            status: "active",
            uplineId: uplineDbId,
            referrerId: referrerDbId,
            contractDate,
            firstPayDate,
            gender: m.gender,
            birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
            mobile: m.phone || null,
            prefecture: m.pref || null,
            city: m.addr ? m.addr.replace(m.pref || '', '') : null,
          },
        })

        // MlmRegistration作成（概要書面No）
        await prisma.mlmRegistration.create({
          data: {
            userId: newUser.id,
            disclosureDocNumber: m.disclosureDocNo || null,
          },
        })

        created.push({
          memberCode: mc,
          name: m.name,
          userId: newUser.id.toString(),
          mlmId: newMlm.id.toString(),
        })
      } catch (err) {
        errors.push({ memberCode: mc, name: m.name, reason: String(err) })
      }
    }

    return NextResponse.json({
      mode: "register",
      summary: { total: MEMBERS_DATA.length, created: created.length, skipped: skipped.length, errors: errors.length },
      created, skipped, errors,
    })
  }

  // ---- PURCHASE モード: MlmPurchase を作成 ----
  if (mode === "purchase") {
    const created = []
    const skipped = []
    const errors = []

    for (const m of MEMBERS_DATA) {
      const mc = memberCodeFromId(m.id)
      try {
        const mlm = await prisma.mlmMember.findUnique({
          where: { memberCode: mc },
          include: {
            purchases: { where: { productCode: PRODUCT_CODE, purchaseMonth: m.purchaseMonth } }
          }
        })
        if (!mlm) {
          errors.push({ memberCode: mc, name: m.name, reason: "MlmMemberなし" })
          continue
        }
        if (mlm.purchases.length > 0) {
          skipped.push({ memberCode: mc, name: m.name, month: m.purchaseMonth, reason: "購入履歴済み" })
          continue
        }

        const purchasedAt = new Date(`${m.purchaseMonth}-01T00:00:00.000Z`)
        const purchase = await prisma.mlmPurchase.create({
          data: {
            mlmMemberId: mlm.id,
            productCode: PRODUCT_CODE,
            productName: PRODUCT_NAME,
            quantity: 1,
            unitPrice: UNIT_PRICE,
            points: POINTS,
            totalPoints: POINTS,
            purchaseStatus: "one_time",
            purchaseMonth: m.purchaseMonth,
            purchasedAt,
          },
        })
        created.push({ memberCode: mc, name: m.name, month: m.purchaseMonth, purchaseId: purchase.id.toString() })
      } catch (err) {
        errors.push({ memberCode: mc, name: m.name, reason: String(err) })
      }
    }

    return NextResponse.json({
      mode: "purchase",
      summary: { total: MEMBERS_DATA.length, created: created.length, skipped: skipped.length, errors: errors.length },
      created, skipped, errors,
    })
  }

  return NextResponse.json({ error: "mode must be check/register/purchase" }, { status: 400 })
}
