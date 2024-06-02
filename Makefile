NETWORK_NAME=grid
HUB_NAME=selenium-hub
CHROME_NAME=selenium-chrome
FIREFOX_NAME=selenium-firefox
EDGE_NAME=selenium-edge

network:
	docker network create $(NETWORK_NAME) || true

hub: network
	docker run -d -p 4442-4444:4442-4444 --net $(NETWORK_NAME) --name $(HUB_NAME) selenium/hub:latest || docker start $(HUB_NAME)

all: hub chrome firefox edge

chrome:
	docker run -d --net $(NETWORK_NAME) -e SE_EVENT_BUS_HOST=$(HUB_NAME) \
        --shm-size="2g" \
        -e SE_EVENT_BUS_PUBLISH_PORT=4442 \
        -e SE_EVENT_BUS_SUBSCRIBE_PORT=4443 \
        -e SE_NODE_OVERRIDE_MAX_SESSIONS=true \
        -e SE_START_XVFB=false \
        -e SE_NODE_MAX_SESSIONS=2 \
        -e SE_ENABLE_BROWSER_LEFTOVERS_CLEANUP=true \
        --name $(CHROME_NAME) \
        selenium/node-chrome:latest || docker start $(CHROME_NAME)

edge: hub
	docker run -d --net $(NETWORK_NAME) -e SE_EVENT_BUS_HOST=$(HUB_NAME) \
        --shm-size="2g" \
        -e SE_EVENT_BUS_PUBLISH_PORT=4442 \
        -e SE_EVENT_BUS_SUBSCRIBE_PORT=4443 \
		-e SE_NODE_OVERRIDE_MAX_SESSIONS=true \
		-e SE_START_XVFB=false \
		-e SE_NODE_MAX_SESSIONS=2 \
		-e SE_ENABLE_BROWSER_LEFTOVERS_CLEANUP=true \
        --name $(EDGE_NAME) \
        selenium/node-edge:latest || docker start $(EDGE_NAME)

firefox: hub
	docker run -d --net $(NETWORK_NAME) -e SE_EVENT_BUS_HOST=$(HUB_NAME) \
        --shm-size="2g" \
        -e SE_EVENT_BUS_PUBLISH_PORT=4442 \
        -e SE_EVENT_BUS_SUBSCRIBE_PORT=4443 \
		-e SE_NODE_OVERRIDE_MAX_SESSIONS=true \
		-e SE_START_XVFB=false \
		-e SE_NODE_MAX_SESSIONS=2 \
		-e SE_ENABLE_BROWSER_LEFTOVERS_CLEANUP=true \
        --name $(FIREFOX_NAME) \
        selenium/node-firefox:latest || docker start $(FIREFOX_NAME)

stop: clean

clean:
	docker stop $(HUB_NAME) $(CHROME_NAME) $(FIREFOX_NAME) $(EDGE_NAME)
	docker rm $(HUB_NAME) $(CHROME_NAME) $(FIREFOX_NAME) $(EDGE_NAME)
	docker network rm $(NETWORK_NAME)