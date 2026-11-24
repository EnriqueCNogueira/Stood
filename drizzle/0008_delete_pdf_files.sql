-- Custom SQL migration file, put your code below! --
-- Escrita à mão: o PDF sai do Stood, e os Arquivos PDF que existirem (só o seed de dev cria) somem
-- antes de a próxima migration tirar 'pdf' do CHECK de files. PDF não guarda bytes em file_blobs.
DELETE FROM "files" WHERE "type" = 'pdf';
