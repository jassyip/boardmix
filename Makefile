.PHONY: dev deploy update stop logs status

dev:
	python3 -m http.server 5173 --directory public

deploy:
	./scripts/deploy.sh

update:
	./scripts/update.sh

stop:
	docker compose down

logs:
	docker compose logs -f --tail=100

status:
	docker compose ps
