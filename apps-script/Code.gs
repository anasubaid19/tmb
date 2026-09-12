/**
 * Tes Masuk Bersama — AL-WILDAN ISLAMIC SCHOOL
 * Google Apps Script: spreadsheet sebagai database.
 *
 * Cara pakai: lihat SETUP.md di folder ini.
 *
 * Protokol:
 *   GET  ?token=T&op=ping
 *   GET  ?token=T&op=read&table=NAMA&q={"field":"value"}   (q opsional)
 *   POST {token, op:"read"|"append"|"update", table, row?, id?, updates?, q?}
 *
 * Semua op tulis (append/update) berjalan di dalam ScriptLock +
 * retry di sisi client. Token dibaca dari Script Properties: API_TOKEN.
 */

var SCHEMA = {
  cabang: ["id", "nama", "portal", "alamat", "program", "landing"],
  kelas: ["id", "cabang_id", "nama", "jenjang"],
  materi: ["id", "cabang_id", "nama", "durasi", "deskripsi"],
  jadwal: ["id", "cabang_id", "tanggal", "sesi", "materi_id", "kelas_id", "ruang", "penguji_id", "tampil"],
  denah: ["id", "cabang_id", "judul", "image_url", "keterangan"],
  penguji: ["id", "kode", "nama", "cabang_id", "kontak"],
  siswa: ["id", "kode", "nama", "cabang_id", "jenjang", "kelas_tujuan", "asal_sekolah", "no_hp_wali", "email", "jenis_kelamin", "program", "peminatan", "status_ujian"],
  nilai: ["id", "siswa_id", "jadwal_id", "materi_id", "skor", "catatan", "foto_path", "diisi_oleh", "ts"],
  users: ["kode", "nama", "role", "password_hash", "ref_id"],
  config: ["id", "key", "value", "cabang_id"],
  kedatangan: ["id", "kode_terdata", "tipe", "waktu", "oleh"],
  pengumuman: ["id", "siswa_id", "cabang_id", "status"],
};

/** Jalankan SEKALI dari editor (Run > setupSheets) untuk membuat semua sheet + header. */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = SCHEMA[name];
    var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var empty = first.every(function (c) { return c === ""; });
    if (empty) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  });
}

function checkToken(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  return !!expected && provided === expected;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("sheet tidak dikenal: " + name);
  return sh;
}

function tableRows(name) {
  var sh = getSheet(name);
  var last = sh.getLastRow();
  if (last < 2) return { headers: SCHEMA[name] || [], rows: [] };
  var values = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = values[i][j];
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function applyFilter(rows, q) {
  if (!q) return rows;
  return rows.filter(function (r) {
    return Object.keys(q).every(function (k) {
      return String(r[k] === undefined ? "" : r[k]) === String(q[k]);
    });
  });
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (!checkToken(p.token)) return json({ ok: false, error: "unauthorized" });
    if (p.op === "ping") return json({ ok: true, time: new Date().toISOString() });
    if (p.op === "read") {
      var q = null;
      if (p.q) q = JSON.parse(p.q);
      var t = tableRows(p.table);
      return json({ ok: true, rows: applyFilter(t.rows, q) });
    }
    return json({ ok: false, error: "op tidak dikenal" });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!checkToken(body.token)) return json({ ok: false, error: "unauthorized" });

    if (body.op === "read") {
      var t = tableRows(body.table);
      return json({ ok: true, rows: applyFilter(t.rows, body.q || null) });
    }

    if (body.op === "append" || body.op === "update") {
      lock.waitLock(30000);
      try {
        var sh = getSheet(body.table);
        var headers = SCHEMA[body.table];
        if (!headers) throw new Error("sheet tidak dikenal: " + body.table);

        if (body.op === "append") {
          var row = body.row || {};
          if (headers.indexOf("id") !== -1 && !row.id) row.id = String(nextId(sh));
          if (headers.indexOf("ts") !== -1 && !row.ts) row.ts = new Date().toISOString();
          var values = headers.map(function (h) {
            return row[h] === undefined ? "" : row[h];
          });
          sh.appendRow(values);
          var out = {};
          headers.forEach(function (h, i) { out[h] = values[i]; });
          return json({ ok: true, row: out });
        }

        // update: cocokkan baris by id (kolom "id") atau by kode (sheet users)
        var data = sh.getDataRange().getValues();
        var head = data[0].map(String);
        var keyCol = head.indexOf("id") !== -1 ? "id" : "kode";
        var keyIdx = head.indexOf(keyCol);
        var target = String(body.id);
        var found = -1;
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][keyIdx]) === target) { found = i + 1; break; }
        }
        if (found === -1) return json({ ok: false, error: "baris tidak ditemukan: " + target });
        var updates = body.updates || {};
        Object.keys(updates).forEach(function (k) {
          var c = head.indexOf(k);
          if (c !== -1) sh.getRange(found, c + 1).setValue(updates[k]);
        });
        return json({ ok: true, id: target });
      } finally {
        lock.releaseLock();
      }
    }

    return json({ ok: false, error: "op tidak dikenal" });
  } catch (err) {
    try { lock.releaseLock(); } catch (ignore) {}
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

/** ID numerik berikutnya (dipanggil di dalam lock). */
function nextId(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var col = sh.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  col.forEach(function (r) {
    var n = parseInt(r[0], 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}
