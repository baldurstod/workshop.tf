package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"github.com/go-viper/mapstructure/v2"
	_ "github.com/lib/pq"
)

var db *sql.DB

func initItemsDB(config Database) {
	db = openPostgre(config.Datasource)
}

var sortFields = map[string]string{
	"index":         "publishedfileid",
	"name":          "title",
	"subscriptions": "subscriptions",
	"updated":       "time_updated",
	"created":       "time_created",
}

// Insert an item in database
// Return true if the item was inserted or updated, false if it was up to date or an error occured
func insertItem(item map[string]any) (bool, error) {
	if db == nil {
		return false, errors.New("database is not initialized. Did you forgot to call openPostgre ?")
	}

	var workshopItem WorkshopItem
	err := mapstructure.Decode(item, &workshopItem)
	if err != nil {
		return false, fmt.Errorf("an error occured while decoding workshop item : <%w>", err)
	}

	var tags = []string{}

	for _, t := range workshopItem.Tags {
		tags = append(tags, t.Tag)
	}

	j, err := json.Marshal(&item)
	if err != nil {
		return false, fmt.Errorf("failed to marshal item: <%w>", err)
	}

	fileId, err := strconv.ParseUint(workshopItem.Publishedfileid, 10, 64)
	if err != nil {
		return false, fmt.Errorf("failed to convert Publishedfileid "+workshopItem.Publishedfileid+": <%w>", err)
	}

	fileSize, err := strconv.ParseUint(workshopItem.FileSize, 10, 64)
	if err != nil {
		return false, fmt.Errorf("failed to convert file size "+workshopItem.FileSize+": <%w> for item "+workshopItem.Publishedfileid, err)
	}

	row := db.QueryRow(`SELECT time_updated from items where publishedfileid = $1;`, fileId)

	var timeUpdated uint64

	err = row.Scan(&timeUpdated)
	if err != nil && err != sql.ErrNoRows {
		return false, fmt.Errorf("failed to scan row in insertItem: <%w>", err)
	}

	if err != sql.ErrNoRows && timeUpdated == workshopItem.TimeUpdated {
		return false, nil
	}

	_, err = db.Exec(`INSERT INTO items (
	publishedfileid, title, time_created, time_updated, creator, tags, file_size, file_url, preview_url, subscriptions, consumer_appid, maybe_inappropriate_sex, maybe_inappropriate_violence, detail )
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 )
	ON CONFLICT (publishedfileid) DO UPDATE SET
	title = $2,
	time_created = $3,
	time_updated = $4,
	creator = $5,
	tags = $6,
	file_size = $7,
	file_url = $8,
	preview_url = $9,
	subscriptions = $10,
	consumer_appid = $11,
	maybe_inappropriate_sex = $12,
	maybe_inappropriate_violence = $13,
	detail = $14
	`,
		fileId,
		workshopItem.Title,
		workshopItem.TimeCreated,
		workshopItem.TimeUpdated,
		workshopItem.Creator,
		tags,
		fileSize,
		workshopItem.FileUrl,
		workshopItem.PreviewUrl,
		workshopItem.Subscriptions,
		workshopItem.ConsumerAppid,
		workshopItem.MaybeInappropriateSex,
		workshopItem.MaybeInappropriateViolence,
		j,
	)

	if err != nil {
		return false, fmt.Errorf("failed to insert workshop item "+workshopItem.Publishedfileid+" : <%w>", err)
	}

	return true, nil
}

type itemFilter struct {
	Name string   `json:"name" mapstructure:"name"`
	Tags []string `json:"tags" mapstructure:"tags"`
}

type itemSort struct {
	Field     string `json:"field" mapstructure:"field"`
	Ascending bool   `json:"ascending" mapstructure:"ascending"`
}

type itemParams struct {
	Filter itemFilter `json:"filter" mapstructure:"filter"`
	Sort   itemSort   `json:"sort" mapstructure:"sort"`
}

func getItems(params itemParams) ([]WorkshopItemSummary, error) {
	if db == nil {
		return nil, errors.New("database is not initialized. Did you forgot to init postgre ?")
	}

	values := []any{}

	sortField, found := sortFields[params.Sort.Field]
	if !found {
		sortField = "time_created"
	}

	var sortDirection = "desc"
	if params.Sort.Ascending {
		sortDirection = "asc"
	}

	query := `SELECT published_files.publishedfileid, creator, title, preview_url, time_created, published_files.time_updated, subscriptions, array_to_json(tags)
	FROM published_files INNER JOIN uploaded_files ON published_files.publishedfileid = uploaded_files.publishedfileid
	WHERE disabled = false ORDER BY ` + sortField + ` ` + sortDirection + ` LIMIT(50000);`
	res, err := db.Query(query, values...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query "+query+"in getItems: <%w>", err)
	}
	defer res.Close()

	result := []WorkshopItemSummary{}

	for res.Next() {
		var publishedfileid string
		var creator string
		var title string
		var fileUrl string
		var timeCreated uint64
		var timeUpdated uint64
		var subscriptions uint64
		var tags string

		err = res.Scan(&publishedfileid, &creator, &title, &fileUrl, &timeCreated, &timeUpdated, &subscriptions, &tags)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row in getItems: <%w>", err)
		}
		var arr []string
		err = json.Unmarshal([]byte(tags), &arr)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal tags: <%w>", err)
		}

		result = append(result, WorkshopItemSummary{publishedfileid, creator, title, fileUrl, timeCreated, timeUpdated, subscriptions, arr})
	}

	// Check if we have an error
	if err := res.Err(); err != nil {
		return nil, fmt.Errorf("failed to get next row in getItems: <%w>", err)
	}

	return result, nil
}

func getItemUrl(id uint64) (string, error) {
	row := db.QueryRow(`SELECT file_url FROM items WHERE publishedfileid = $1;`, id)

	file_url := ""

	err := row.Scan(&file_url)
	if err != nil {
		return "", fmt.Errorf("failed to scan row in getItems: <%w>", err)
	}

	return file_url, nil
}

func setItemBroken(id uint64) error {
	_, err := db.Exec(`UPDATE items SET broken = TRUE WHERE publishedfileid = $1;`, id)

	if err != nil {
		return fmt.Errorf("failed to set item broken for item"+strconv.FormatUint(id, 10)+":  <%w>", err)
	}

	return nil
}
