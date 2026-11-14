package com.example.taskboard;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 起動時に PostgreSQL への接続を確認するための確認用コンポーネント。
 *
 * <p>spring-boot-starter-jdbc は接続を遅延生成するため、DB が起動していなくても
 * アプリ自体は起動してしまう。ここで明示的に 1 回クエリを実行し、接続が成立して
 * いることを起動ログで確認できるようにしている。</p>
 *
 * <p>※ 動作確認用。次ステップ（JPA / Flyway 導入）で不要になれば削除してよい。</p>
 */
@Component
public class DbConnectionCheckRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DbConnectionCheckRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public DbConnectionCheckRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        String version = jdbcTemplate.queryForObject("SELECT version()", String.class);
        log.info("PostgreSQL connected: {}", version);
    }
}
