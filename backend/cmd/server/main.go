package main

import (
	"context"
	"cubby/internal/config"
	"cubby/internal/db"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"cubby/internal/service"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

type appServices struct {
	auth     *service.AuthService
	folder   *service.FolderService
	bookmark *service.BookmarkService
	search   *service.SearchService
	importer *service.ImportService
	exporter *service.ExportService
	metadata *service.MetadataService
	move     *service.MoveService
	preview  *service.PreviewService
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	database := db.MustOpen(cfg.DBPath)
	defer database.Close()

	r, err := buildRouter(cfg, database)
	if err != nil {
		log.Fatalf("build router: %v", err)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.BackendPort,
		Handler: r.Handler(),
	}

	go func() {
		log.Printf("listening on :%s", cfg.BackendPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %s", err)
	}
	log.Println("server stopped")
}

func buildServices(cfg *config.Config, database *sql.DB) (*appServices, error) {
	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	moveRepo := repository.NewMoveRepo(database)
	settingRepo := repository.NewSettingRepo(database)

	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)

	authSvc := service.NewAuthService(cfg, settingRepo)
	if err := authSvc.SyncConfiguredPassword(); err != nil {
		return nil, fmt.Errorf("sync configured password: %w", err)
	}
	folderSvc := service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := service.NewMoveService(moveRepo, folderSvc, sortKeySvc)
	searchSvc := service.NewSearchService(bookmarkRepo)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)
	exportSvc := service.NewExportService(folderSvc, bookmarkSvc)
	metadataSvc := service.NewMetadataService()
	previewSvc := service.NewPreviewService(cfg.PreviewOrigin)

	return &appServices{
		auth:     authSvc,
		folder:   folderSvc,
		bookmark: bookmarkSvc,
		search:   searchSvc,
		importer: importSvc,
		exporter: exportSvc,
		metadata: metadataSvc,
		move:     moveSvc,
		preview:  previewSvc,
	}, nil
}

func buildRouter(cfg *config.Config, database *sql.DB) (*gin.Engine, error) {
	services, err := buildServices(cfg, database)
	if err != nil {
		return nil, err
	}

	r := gin.Default()
	if err := configureTrustedProxies(r, cfg); err != nil {
		return nil, err
	}
	installBodyLimitMiddleware(r)
	installCORSMiddleware(r, cfg.AllowedOrigins)

	handler.SetupRoutes(
		r,
		services.auth,
		services.folder,
		services.bookmark,
		services.search,
		services.importer,
		services.exporter,
		services.metadata,
		services.move,
		services.preview,
		cfg,
	)
	setupFrontendRoutes(r, resolveFrontendDist())

	return r, nil
}

func configureTrustedProxies(r *gin.Engine, cfg *config.Config) error {
	if len(cfg.TrustedProxies) == 0 {
		if err := r.SetTrustedProxies(nil); err != nil {
			return fmt.Errorf("configure trusted proxies: %w", err)
		}
	} else if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return fmt.Errorf("configure trusted proxies: %w", err)
	}
	return nil
}

func installBodyLimitMiddleware(r *gin.Engine) {
	// Task 1.5: Limit request body size to 10MB.
	r.Use(func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20)
		c.Next()
	})
}

func installCORSMiddleware(r *gin.Engine, allowedOrigins []string) {
	// Task 1.6: CORS middleware.
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		var allowed bool
		if len(allowedOrigins) == 0 {
			// Same-origin only: no Origin header or Origin matches the request host.
			if origin == "" || origin == fmt.Sprintf("http://%s", c.Request.Host) || origin == fmt.Sprintf("https://%s", c.Request.Host) {
				allowed = true
			}
		} else {
			for _, o := range allowedOrigins {
				if origin == o {
					allowed = true
					break
				}
			}
		}

		if allowed && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}

		// Always expose CORS headers for preflight so the client can proceed.
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "43200")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})
}

func resolveFrontendDist() string {
	if distDir := os.Getenv("CUBBY_FRONTEND_DIST"); distDir != "" {
		return filepath.Clean(distDir)
	}

	candidates := []string{
		filepath.Join("frontend", "dist"),
		filepath.Join("..", "frontend", "dist"),
		filepath.Join("..", "..", "..", "frontend", "dist"),
	}
	for _, candidate := range candidates {
		if frontendIndexExists(candidate) {
			return filepath.Clean(candidate)
		}
	}
	return filepath.Clean(candidates[0])
}

func frontendIndexExists(distDir string) bool {
	info, err := os.Stat(filepath.Join(distDir, "index.html"))
	return err == nil && !info.IsDir()
}

func setupFrontendRoutes(r *gin.Engine, distDir string) {
	if !frontendIndexExists(distDir) {
		log.Printf("frontend build not found at %s; run frontend build or set CUBBY_FRONTEND_DIST", distDir)
	}

	r.Static("/assets", filepath.Join(distDir, "assets"))
	r.Static("/theme", filepath.Join(distDir, "theme"))
	r.StaticFile("/favicon.svg", filepath.Join(distDir, "favicon.svg"))
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.File(filepath.Join(distDir, "index.html"))
	})
}
